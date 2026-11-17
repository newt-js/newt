---
title: newt add use-case
description: Adds a use case to a module, with its schema and its test.
sidebar:
  order: 5
---

`newt add use-case` adds one thing a module does, such as completing a task. It writes a method that reads the entity by its id, saves it and returns it, ready for you to fill in.

## Usage

```sh
newt add use-case <context>/<module> <use-case> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context/module` | A module of the backend, as in `tasks/task` |
| `use-case` | The use case's name, as in `complete-task` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

## Name rules

- Lowercase words joined by `-`, each starting with a letter: `complete-task` becomes the method `completeTask`.
- Not `find`, `get`, `paginate` or `search`: newt's lint shapes those reads.
- Not `name`, `useCaseRunner`, `on`, `deps` or `events`, which every module has, nor a word JavaScript keeps.
- Not a name the module already has as a member, or whose schema (`TaskCompleteTaskSchema`, `TaskCompleteTaskDTO`) is already in `<module>.schema.ts`.

## What it writes

```sh
newt add use-case tasks/task complete-task
```

```text
  updated  src/contexts/tasks/modules/task/task.schema.ts
  updated  src/contexts/tasks/modules/task/task.module.ts
  updated  src/contexts/tasks/modules/task/task.module.test.ts

Next steps:
  change the task by a method of its entity, in task.ts, and call it before persist in completeTask
  bun test src/contexts/tasks/modules/task
```

The schema and the method it adds:

```ts title="src/contexts/tasks/modules/task/task.schema.ts"
export const TaskCompleteTaskSchema = TaskSchema.pick({ id: true })
export type TaskCompleteTaskDTO = z.input<typeof TaskCompleteTaskSchema>
```

```ts title="src/contexts/tasks/modules/task/task.module.ts"
  @UseCase()
  async completeTask(input: TaskCompleteTaskDTO): Promise<TaskDTO> {
    const { id } = TaskCompleteTaskSchema.parse(input)
    const [task] = await this.tasks.find(TaskFilter.toCriteria<TaskRow>({ id }), { limit: 1 })
    if (!task) {
      throw new TaskNotFound()
    }
    await this.tasks.persist(task)
    return task.toDTO()
  }
```

The test checks that the use case reads the task by its id and returns it. Running the command again for the same use case changes nothing.

## Next steps

- Change the entity with a method of its own, in `<module>.ts`, and call it before `persist`.
- `bun test src/contexts/<context>/modules/<module>`

## Errors

- **Missing arguments**: `newt add use-case takes the module and the use case, as in newt add use-case sales/order mark-paid`.
- **A context or module that is not there**: refused, naming the command that adds it.
- **A read's name** (`find`, `get`, `paginate`, `search`): refused; name the use case by what it does.
- **A name the module already uses**: refused.

See [Use cases](/concepts/use-cases/).
