---
title: newt add error
description: Adds an error to a module, of a kind that sets its HTTP status.
sidebar:
  order: 10
---

`newt add error` adds an error a module can throw, such as completing a task that is already done. Its kind decides the HTTP status the client gets.

## Usage

```sh
newt add error <context>/<module> <error> --kind <kind> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context/module` | A module of the backend, as in `tasks/task` |
| `error` | What went wrong, as in `already-done` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--kind <kind>` | required | What HTTP answers it with |
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

| Kind | Extends | HTTP status |
|---|---|---|
| `validation` | `ValidationError` | 400 |
| `unauthorized` | `UnauthorizedError` | 401 |
| `forbidden` | `ForbiddenError` | 403 |
| `not-found` | `NotFoundError` | 404 |
| `conflict` | `ConflictError` | 409 |

## Name rules

- Lowercase letters and digits, words joined by `-`, starting with a letter.
- Not the name of a class newt's errors extend (`validation-error`, `known-error`…).
- Its code, `<module>.<name with _>`, is not used by another error of the module. A name that starts with the module drops it from the code: `task-already-done` and `already-done` both give `task.already_done`.

## What it writes

```sh
newt add error tasks/task already-done --kind conflict
```

```text
  created  src/contexts/tasks/modules/task/errors/already-done.ts

Next steps:
  throw it where it happens: throw new AlreadyDone()
```

```ts title="src/contexts/tasks/modules/task/errors/already-done.ts"
import { ConflictError } from '@newt-js/core'

export class AlreadyDone extends ConflictError {
  readonly code = 'task.already_done'

  constructor() {
    super('Already done')
  }
}
```

## Next steps

- Throw it where it happens: `throw new AlreadyDone()`.

## Errors

- **No `--kind`**: `newt add error needs --kind, which says what HTTP answers it with: validation, unauthorized, forbidden, not-found, conflict`.
- **An unknown kind**: refused, listing the five.
- **The file exists and extends another kind**: refused; change it by hand.
- **A code another error has**: refused; name the error by what else went wrong.
- **A context or module that is not there**: refused, naming the command that adds it.

See [Errors](/concepts/errors/).
