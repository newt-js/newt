---
title: newt add event
description: Adds an event to a module, in its events folder.
sidebar:
  order: 7
---

`newt add event` adds a record of something that happened in a module, such as a task being completed. Other parts of the app can then react to it.

## Usage

```sh
newt add event <context>/<module> <event> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context/module` | A module of the backend, as in `tasks/task` |
| `event` | What happened, as in `completed` or `price-changed` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

## Name rules

- Lowercase words joined by `-`, each starting with a letter.
- It does not repeat the module: in `tasks/task`, `completed`, not `task-completed`. The file is named `task-completed.ts` anyway.
- Not `module`, `repository` or `deps`: `Task_Module`, `Task_Repository` and `Task_Deps` are the module's own.

## What it writes

```sh
newt add event tasks/task completed
```

```text
  created  src/contexts/tasks/modules/task/events/task-completed.ts

Next steps:
  emit it from a method of the entity: this.trackEvent(new Task_Completed({ id: this.id }))
  let other modules subscribe to it: add completed: Task_Completed to eventsOf in task.module.ts
```

```ts title="src/contexts/tasks/modules/task/events/task-completed.ts"
import { defineEvent } from '@newt-js/core'
import { TaskSchema } from '../task.schema'

export const Task_Completed = defineEvent('task.completed', TaskSchema.pick({ id: true }))
```

If the module has no `TaskSchema` in `<module>.schema.ts`, the event's schema is written inline instead.

## Next steps

- Emit it from a method of the entity: `this.trackEvent(new Task_Completed({ id: this.id }))`.
- To let other modules subscribe, add `completed: Task_Completed` to `eventsOf` in `<module>.module.ts`. [`newt add subscription`](/reference/cli/add-subscription/) does this for you.

## Errors

- **Missing arguments**: `newt add event takes the module and the event, as in newt add event sales/order shipped`.
- **A name that repeats the module**: `'task-completed' repeats the module: name it completed, and it becomes Task_Completed in events/task-completed.ts`.
- **`module`, `repository` or `deps`**: refused; name it by what happened.
- **A context or module that is not there**: refused, naming the command that adds it.

See [Events and subscriptions](/concepts/events/).
