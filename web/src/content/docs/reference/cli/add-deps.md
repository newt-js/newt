---
title: newt add deps
description: Lets a module use another module of its context.
sidebar:
  order: 13
---

`newt add deps` lets one module call another module of the same context, such as a task reading its project. The other module is passed in when the context starts.

## Usage

```sh
newt add deps <context>/<module> <module-it-uses> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context/module` | The module that uses the other, as in `tasks/task` |
| `module-it-uses` | Another module of the same context, as in `project` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

## What it writes

```sh
newt add deps tasks/task project
```

```text
  created  src/contexts/tasks/modules/task/task.deps.ts
  updated  src/contexts/tasks/modules/task/task.module.ts
  updated  src/contexts/tasks/tasks-modules.ts

Next steps:
  call it in a use case of task: this.deps.project
  bun test src/contexts/tasks/modules/task
```

```ts title="src/contexts/tasks/modules/task/task.deps.ts"
import type { Project_Module } from '../project/project.module'

export type Task_Deps = {
  project: Project_Module
}
```

```ts title="src/contexts/tasks/tasks-modules.ts"
export function tasksModules(base: ContextBase, router: HttpRouter) {
  const project = Project_Module.initialize(base, router)
  const task = Task_Module.initialize(base, router, { project })
  return {
    task,
    project,
  }
}
```

- `<module>.deps.ts` is created if missing, and gets the module it uses.
- `<module>.module.ts` takes `Task_Deps` in `initialize` and its constructor, and keeps it as `this.deps`.
- `<context>-modules.ts` passes the module in, and orders the modules so each starts after the ones it uses.

## Next steps

- Call it in a use case: `this.deps.project`.
- `bun test src/contexts/<context>/modules/<module>`

## Errors

- **Missing arguments**: `newt add deps takes the module and the module of its context it uses`.
- **A module of another context** (`tasks/project`): refused; newt does not write that yet.
- **The module itself**: refused.
- **A module the context does not have**: refused; add it with [`newt add module`](/reference/cli/add-module/).
- **A cycle**: `project → task → project would be a cycle: modules never use each other, even through others`.

See [Services and dependencies](/concepts/services-and-deps/).
