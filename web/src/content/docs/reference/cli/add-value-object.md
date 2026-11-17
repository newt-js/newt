---
title: newt add value-object
description: Adds a value object to a module, with the error it throws and its test.
sidebar:
  order: 11
---

`newt add value-object` adds a value with rules, such as a task's priority: text that is checked and cleaned every time one comes in. It writes the value object, the error it throws for a bad value, and a test.

## Usage

```sh
newt add value-object <context>/<module> <value-object> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context/module` | A module of the backend, as in `tasks/task` |
| `value-object` | The value's name, as in `priority` or `postal-code` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

## Name rules

- Lowercase letters and digits, words joined by `-`, starting with a letter.
- Not `<module>-id`: every module has its id already (`TaskId`).

## What it writes

```sh
newt add value-object tasks/task priority
```

```text
  created  src/contexts/tasks/modules/task/value-objects/priority.ts
  created  src/contexts/tasks/modules/task/value-objects/priority.test.ts
  created  src/contexts/tasks/modules/task/errors/invalid-priority.ts

Next steps:
  give its rules to the schema it has: z.string().trim().min(1).max(100) in priority.ts
  use it in the module's schema, Priority.schema, and where a value comes in, Priority.from(text)
```

```ts title="src/contexts/tasks/modules/task/value-objects/priority.ts"
import { defineValueObject } from '@newt-js/core'
import { z } from 'zod'
import { InvalidPriority } from '../errors/invalid-priority'

export const Priority = defineValueObject(
  z.string().trim().min(1).max(100).brand<'Priority'>(),
  text => new InvalidPriority(text),
)
export type Priority = z.output<typeof Priority.schema>
```

The error is a `ValidationError` (HTTP 400) with the code `<module>.invalid_<name>`.

## Next steps

- Give it its rules, in place of `z.string().trim().min(1).max(100)`.
- Use `Priority.schema` in the module's schema, and `Priority.from(text)` where a value comes in.

## Errors

- **Missing arguments**: `newt add value-object takes the module and the value object, as in newt add value-object sales/order sku`.
- **`<module>-id`**: refused; the module has its id.
- **Some of its three files exist but not all**: refused; a value object is its files together. Name it otherwise, or take them out.
- **A context or module that is not there**: refused, naming the command that adds it.

See [Value objects](/concepts/value-objects/).
