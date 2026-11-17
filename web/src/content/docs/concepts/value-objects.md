---
title: Value objects
description: Values with rules, such as an id or an email, checked once where they are made.
sidebar:
  order: 4
---

A value object is a value with rules, such as a task's id, an email or a priority. It is a plain string or number with a type that says what it is, made only by a function that checks it.

A function that takes a `TaskId` cannot get a project's id or a random string by mistake. TypeScript refuses it, and the value was already checked where it was made.

## A value object

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

```ts
Priority.from(' A-1 ')   // 'A-1', typed Priority
Priority.from('  ')      // throws InvalidPriority
Priority.tryFrom('  ')   // undefined
```

At run time a `Priority` is a string. The `.brand<'Priority'>()` only exists for TypeScript, so a plain `string` is not a `Priority` until `from` checked it.

## Using one in a schema

Put its `schema` in the module's schema. The field then has the value object's rules and type:

```ts title="src/contexts/tasks/modules/task/task.schema.ts"
export const TaskSchema = z.object({
  id: TaskId.schema,
  name: z.string().trim().min(1).max(100),
  priority: Priority.schema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
```

`TaskDTO['priority']` is now a `Priority`. Inside a schema, a bad value fails like any other zod check: HTTP answers `400` with the code `validation`. Only `from` throws your own error.

:::caution
A new field in the schema needs its column too. Write a migration for it (see [Database and migrations](/concepts/database/)).
:::

## defineValueObject

```ts
defineValueObject(schema, invalid, extra?)
```

| Argument | What it is |
|---|---|
| `schema` | A zod schema, usually ending in `.brand<'Name'>()`. |
| `invalid` | `(input) => KnownError`: the error `from` throws when the schema refuses the input. |
| `extra` | Optional. An object whose members are added to the result, such as `generate()`. |

It returns:

| Member | What it does |
|---|---|
| `schema` | The schema. Use it inside other schemas: `id: TaskId.schema`. |
| `from(input)` | Returns the checked value, or throws the error from `invalid`. |
| `tryFrom(input)` | Returns the checked value, or `undefined`. |

:::tip
Make the error a `ValidationError` (`newt add value-object` does). A bad value from a client then becomes a `400` with your error's code, not a `500`.
:::

## Ids: uuidFactory and Uuid

Every module gets an id type of its own:

```ts title="src/contexts/tasks/modules/task/value-objects/task-id.ts"
import { uuidFactory, type Uuid } from '@newt-js/core'

export const TaskId = uuidFactory('TaskId')
export type TaskId = Uuid<'TaskId'>
```

`uuidFactory(name)` makes a value object for UUID v7 strings, with one extra member:

- `TaskId.generate()` returns a new UUID v7, typed `TaskId`.
- `TaskId.from(text)` refuses anything that is not a UUID v7, with `InvalidUuid` (code `invalid_uuid`).

Routes turn the path's text into an id before calling a use case:

```ts title="src/contexts/tasks/modules/task/task.routes.ts"
router.get('/tasks/:id', async request =>
  Response.json(
    await tasks.get(TaskId.from(request.params.id)),
  ),
)
```

`Uuid` itself is a ready-made `uuidFactory('Uuid')` for an id of no particular kind.

:::note
A module that keeps another module's id, such as a task's `projectId`, declares a value object of its own for it, `value-objects/project-id.ts` with `uuidFactory('ProjectId')`. The lint rule `module-imports` does not let it import the other module's `value-objects/`, nor its schema as a value. Its type is the same as the other module's id all the same, since `uuidFactory` brands it with its name: a `ProjectDTO['id']` fits it.
:::

## Built-in value objects

`@newt-js/core` ships these. Each one except `EventId` also has a factory (`emailFactory()`, `keyFactory(name, pattern?)` and so on) that makes a new one with the same rules.

| Value object | What it is for | Error and code |
|---|---|---|
| `Email` | An email address. | `InvalidEmail`, `invalid_email` |
| `Key` | A short name made by a program. | `InvalidKey`, `invalid_key` |
| `SearchText` | The text a user types in a search box. | `InvalidSearchText`, `invalid_search_text` |
| `SecretToken` | A random secret, as a sign-in token. | `InvalidSecretToken`, `invalid_secret_token` |
| `Uuid` | An id of no particular kind. | `InvalidUuid`, `invalid_uuid` |
| `EventId` | The id of a published event. | `InvalidUuid`, `invalid_uuid` |

Their rules:

- **`Email`** trims the text, lowers its case, and checks it is an email of at most 254 characters.
- **`Key`** takes 1 to 200 letters, digits, `.`, `_`, `:` or `-`. `keyFactory('Slug', /^[a-z0-9-]+$/)` makes a key type with your own pattern.
- **`SearchText`** trims the text and takes at most 100 characters. An empty text is valid. Use it as the `text` of a `search(text, page)` use case.
- **`SecretToken`** is 43 characters of base64url. `SecretToken.generate()` makes one from 32 random bytes, and `SecretToken.hash(token)` returns its SHA-256 in hex.
- **`EventId`** is a `uuidFactory('EventId')`: the id every event gets when it is published.

:::danger
Store `SecretToken.hash(token)`, never the token itself. Whoever reads your database could otherwise use every token in it.
:::

## With the CLI

```sh
newt add value-object tasks/task priority
```

It writes `value-objects/priority.ts`, its error `errors/invalid-priority.ts` (a `ValidationError` with the code `task.invalid_priority`) and a test. Edit the schema to say what a priority is. See [`newt add value-object`](/reference/cli/add-value-object/).
