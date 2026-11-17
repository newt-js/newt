---
title: newt add subscription
description: Runs a use case of a module each time one of its events happens.
sidebar:
  order: 8
---

`newt add subscription` makes a use case run after an event, such as notifying the assignee when a task is completed. The use case runs later as a job: a pending piece of work kept in a queue in your database (the *outbox*).

## Usage

```sh
newt add subscription <context>/<module> <use-case> --on <event> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context/module` | A module of the backend, as in `tasks/task` |
| `use-case` | A use case of that module, as in `notify-assignee` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--on <event>` | required | The event of the module it runs on, as in `completed` |
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

## What it writes

```sh
newt add subscription tasks/task notify-assignee --on completed
```

```text
  created  src/contexts/tasks/modules/task/task.workers.ts
  updated  src/contexts/tasks/modules/task/task.module.ts

Warnings:
  newt cannot tell how to make completed happen, so it wrote no test of notifyAssignee on it: write one in task.module.test.ts

Next steps:
  bun test src/contexts/tasks/modules/task
```

```ts title="src/contexts/tasks/modules/task/task.workers.ts"
import type { Task_Module } from './task.module'

export function registerTaskWorkers(tasks: Task_Module): void {
  tasks.on(tasks.events.completed, 'notifyAssignee', completed => [
    { id: completed.id },
  ])
}
```

- `<module>.workers.ts` is created if missing, and gets the line that subscribes the use case.
- `<module>.module.ts` gets the event in `eventsOf`, and a call to `register<Module>Workers(module)`.
- When the use case takes an input, it receives `{ id }` from the event. When it takes none, it is called with nothing.
- On the `created` event, newt also writes a test that creates an entity and checks the job ran. For other events it warns instead.

## Next steps

- `bun test src/contexts/<context>/modules/<module>`

## Errors

- **Missing arguments or `--on`**: `newt add subscription takes the module, its use case and --on the event`.
- **A use case the module does not have**: refused; add it with [`newt add use-case`](/reference/cli/add-use-case/).
- **An event the module does not have**: refused; it listens to the module's own events only. Add it with [`newt add event`](/reference/cli/add-event/).

See [Events and subscriptions](/concepts/events/) and [Jobs and workers](/concepts/jobs-and-workers/).
