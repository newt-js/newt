---
title: newt add service
description: Adds a service to a module, a function its use cases share.
sidebar:
  order: 12
---

`newt add service` adds a plain function that several use cases of a module share, such as working out due dates. It lives in the module's `services/` folder.

## Usage

```sh
newt add service <context>/<module> <service> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context/module` | A module of the backend, as in `tasks/task` |
| `service` | What it does, as in `due-dates` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

## Name rules

- Lowercase words joined by `-`, each starting with a letter: `due-dates` becomes the function `dueDates`.
- Not a word JavaScript keeps, nor a name newt's generated code uses (`module`, `base`, `router`, `id`, `name`…).

## What it writes

```sh
newt add service tasks/task due-dates
```

```text
  created  src/contexts/tasks/modules/task/services/due-dates.ts

Next steps:
  call it from the use cases that share it: import { dueDates } from './services/due-dates'
```

```ts title="src/contexts/tasks/modules/task/services/due-dates.ts"
import type { TaskDTO } from '../task.schema'

export function dueDates(task: TaskDTO): TaskDTO {
  return task
}
```

If the module has no `TaskDTO` in `<module>.schema.ts`, the function takes and returns `unknown`.

## Next steps

- Import it in the use cases that share it: `import { dueDates } from './services/due-dates'`.

## Errors

- **Missing arguments**: `newt add service takes the module and the service, as in newt add service sales/order price-rounding`.
- **A kept name**: refused; name it by what it does.
- **A context or module that is not there**: refused, naming the command that adds it.

See [Services and dependencies](/concepts/services-and-deps/).
