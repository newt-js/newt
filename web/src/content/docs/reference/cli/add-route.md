---
title: newt add route
description: Adds an HTTP route to a module that calls one of its use cases.
sidebar:
  order: 6
---

`newt add route` adds a URL that runs a use case, such as `POST /tasks/api/tasks/:id/complete-task`. It writes the route and its tests.

## Usage

```sh
newt add route <context>/<module> <use-case> [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context/module` | A module of the backend, as in `tasks/task` |
| `use-case` | A use case of that module, as in `complete-task` |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--method <method>` | `post` | `get`, `post`, `put`, `patch` or `delete` |
| `--path <path>` | see the list | The path under `/<context>/api` |
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

- The default path is `/<plural>/:id/<use-case>`, as in `/tasks/:id/complete-task`.
- `--method` is not case sensitive.

## Path rules

- Starts with `/` and has only letters, digits and `/ : _ -`.
- Does not start with `/api/` nor `/<context>/`: every route of the context is under `/<context>/api` already.
- Is not `/files` or under it: that is where the context's files are served.
- No empty segments (no `//`, no trailing `/`), and each `:param` once.
- No other route of the backend has the same method and path.

## What it writes

```sh
newt add route tasks/task complete-task
```

```text
  updated  src/contexts/tasks/modules/task/task.routes.ts
  updated  src/contexts/tasks/modules/task/task.module.test.ts

Next steps:
  bun test src/contexts/tasks/modules/task
```

```ts title="src/contexts/tasks/modules/task/task.routes.ts"
router.post('/tasks/:id/complete-task', async request =>
  Response.json(
    await tasks.completeTask({ id: TaskId.from(request.params.id) }),
  ),
)
```

How the route calls the use case:

| The use case | The route |
|---|---|
| Takes an input, path has `:id` | Passes `{ id }` from the path |
| Takes the entity's id itself (`get(id: string)`), path has `:id` | Passes the id from the path |
| Takes an input, no `:id` | Passes the request body |
| Takes no input | Calls it with nothing |
| Returns nothing | Answers `204` with no body |

The tests call the route as a signed-in user, and check that it answers 401 to someone who is not. Running the command again for the same route changes nothing.

## Warnings

- A route that passes the body gets no test: newt cannot tell what body to send. Write one in `<module>.module.test.ts`.
- A `:param` the use case does not get is reported: read it in `<module>.routes.ts` as `request.params.<param>`.

## Next steps

- `bun test src/contexts/<context>/modules/<module>`

## Errors

- **Missing arguments**: `newt add route takes the module and the use case it calls`.
- **A use case the module does not have**: refused; add it with [`newt add use-case`](/reference/cli/add-use-case/).
- **A use case with more than one input**: refused; write its route by hand.
- **A `get` or `delete` for a use case with an input, without `:id`**: refused; add `:id` or use `post`, `put` or `patch`.
- **A bad method or path**: refused, saying which rule.
- **A method and path already taken**: refused, naming the file that has it.

See [HTTP and routes](/concepts/http/) and [HTTP API](/reference/http/).
