---
title: Scheduled tasks
description: Run a use case at fixed times, such as every day at 9:00, once across all your instances.
sidebar:
  order: 10
---

A scheduled task runs a use case at fixed times, written as a cron expression. Use it for work nobody asks for with a request: daily reminders, nightly clean-ups, weekly reports.

## A scheduled task

You define it in the module's constructor with `base.schedules.define(name, cron)`, and subscribe a use case to it:

```ts title="src/contexts/tasks/modules/task/task.module.ts"
readonly remindOverdueSchedule

private constructor(base: ContextBase, private readonly tasks: Task_Repository, private readonly deps: Task_Deps) {
  super('task', base.useCaseRunner, deps)
  this.remindOverdueSchedule = base.schedules.define('task.remindOverdue', '0 9 * * *')
}

@UseCase()
async remindOverdue(): Promise<void> {
}
```

```ts title="src/contexts/tasks/modules/task/task.workers.ts"
export function registerTaskWorkers(tasks: Task_Module): void {
  tasks.on(tasks.remindOverdueSchedule, 'remindOverdue')
}
```

`define` returns an event source, like one of the module's [events](/concepts/events/). When the time comes, the schedule emits an event named after it, and `on` runs the use case from a job, as any subscription.

### Names

- A schedule is named `<module>.<name>`, in camelCase: `task.remindOverdue`.
- Each name is defined once per context. Defining it twice throws.
- The subscription's queue is `task.remindOverdue.on.task.remindOverdue`.

### What the use case gets

The event's payload is `{ dueAt }`: the time the run was due, as an ISO date. A use case with no input ignores it. To pass it on, map it:

```ts
tasks.on(tasks.remindOverdueSchedule, 'remindOverdue', tick => [{ until: tick.dueAt }])
```

:::tip
Use `dueAt`, not the current time, to decide what to process. If the run is late or retried, it still covers the same period.
:::

## Cron expressions

A cron expression has five fields, separated by spaces:

```text
minute  hour  day-of-month  month  day-of-week
0-59    0-23  1-31          1-12   0-7
```

Each field takes:

| Form | Example | Means |
|---|---|---|
| `*` | `*` | every value |
| a number | `9` | that value |
| a range | `1-5` | from 1 to 5 |
| a list | `0,30` | each of them |
| a step | `*/15`, `10-50/10`, `5/15` | every 15, from the start |

In day-of-week, both `0` and `7` are Sunday. When both day-of-month and day-of-week are restricted (neither starts with `*`), a day matches if it fits either one, as in classic cron.

Some examples:

| Cron | Runs |
|---|---|
| `0 9 * * *` | every day at 09:00 |
| `*/15 * * * *` | every 15 minutes |
| `0 3 * * 1-5` | Monday to Friday at 03:00 |
| `0 0 1 * *` | the first of each month at 00:00 |

Names (`MON`, `JAN`), `@daily`, `?`, `L` and `#` are not supported. A wrong expression throws when the module is built, so the app does not start.

### Time zone

Every cron runs in **UTC**. There is no time zone option.

:::caution
`0 9 * * *` is 09:00 UTC, not 09:00 where your users are. Convert the hour yourself, and remember that daylight saving time moves local time but not UTC.
:::

## What runs it

Each context starts its schedules when [`runContexts`](/concepts/http/#running-the-server) starts it, alongside its [worker](/concepts/jobs-and-workers/). There is no separate process to run.

The schedules look at the clock at least once a minute, and sooner when the next run is closer. A run starts within about a minute of its time.

When a run is due:

1. Newt writes the due time in the `newt_schedule_tick` table of the context's database.
2. In the same transaction, it emits the schedule's event, which queues one job per subscription.
3. A worker runs the use case, with the same retries as any [job](/concepts/jobs-and-workers/).

### Once across instances

When you run several instances, each one looks at the clock. Only one wins: the row in `newt_schedule_tick` has a version, and only the first instance to update it emits the event. The use case runs once per due time, whatever the number of instances.

### The first run, and missed runs

- The first time an instance sees a new schedule, it only records the latest due time. The first real run is the next one.
- If the app was down when runs were due, it runs **once** when it comes back, for the latest of them, not once per missed run.

:::note
Since a run goes through a job, it follows job rules: it can be retried, and it is delivered at least once. Write the use case so that running it twice does no harm.
:::

## In tests

The test context does not tick on its own. Call `schedules.tick()`, move the test clock, and wait for the jobs:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test('remindOverdue runs at 0 9 * * *', async () => {
  await context.base.schedules.tick()
  context.clock.advance(366 * 24 * 60 * 60 * 1000)
  await context.base.schedules.tick()
  await context.settle()

  const queued = await context.base.database.outbox.list()
  expect(queued.find(each => each.queue === 'task.remindOverdue.on.task.remindOverdue')?.status).toBe('done')
})
```

The first `tick()` records the starting point; the second, a year later, finds a run due. See [Testing](/guides/testing/).

## With the CLI

`newt add schedule` writes the schedule, the use case and its subscription:

```sh
newt add schedule tasks/task remind-overdue --cron "0 9 * * *"
```

It adds `remindOverdueSchedule` and an empty `remindOverdue` use case to the module, the line in `task.workers.ts`, and a test. The use case may not take an input, since a schedule gives none. See [newt add schedule](/reference/cli/add-schedule/).
