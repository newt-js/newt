---
title: Repositories, filters and pages
description: How a module reads and saves its entities, filters rows with criteria, and returns lists one page at a time.
sidebar:
  order: 6
---

A repository is the class that reads a module's entities from its table and saves them back. Use cases never write SQL: they ask the repository with criteria and hand it entities to save.

newt's `Repository` already knows how to read, save, check versions and publish events. Your repository only says which table it uses and how a row becomes an entity.

## A repository

```ts title="src/contexts/tasks/modules/task/task.repository.ts"
import { Repository } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import { Task } from './task'
import type { TaskDTO } from './task.schema'

export type TaskRow = TaskDTO & { version: number }

export class Task_Repository extends Repository<Task, TaskRow> {
  constructor(base: ContextBase) {
    super(base, base.database.records<TaskRow>('task'), { scope: 'none' })
  }

  protected toEntity(row: TaskRow): Task {
    return Task.fromDTO(row)
  }
}
```

The constructor takes:

- The context's base, for its transactions, its events and its use case runner.
- `base.database.records<TaskRow>('task')`: the rows of the table `task`.
- Options: `scope` (required, `'none'` or a scope) and `softDelete` (default `false`). See [Scope](#scope) and [Soft delete](#soft-delete).

A repository has no public methods of its own. The lint rule `repository-public-methods` refuses them: what a module decides belongs in its use cases and its entity.

## Reading

| Method | Returns |
|---|---|
| `find(criteria?, options?)` | The matching entities. |
| `count(criteria?, options?)` | How many match. |
| `count(criteria, { by })` | How many match, per value of the fields in `by`. |
| `paginate(criteria, page, options?)` | One [page](#pages) of matching entities. |

Options of `find`:

- `limit`: at most this many.
- `orderBy`: a list of `{ field, direction? }`, `direction` being `'asc'` (default) or `'desc'`. Without it, rows come by id, ascending. Ids are UUID v7, which grow with time, so that is oldest first.
- `everyScope`: `true` reads past the repository's [scope](#scope).

```ts
const [task] = await this.tasks.find({ id }, { limit: 1 })
const open = await this.tasks.count({ doneAt: null })
const perProject = await this.tasks.count({}, { by: ['projectId'] })
// [{ projectId: '0190…', count: 4 }, …]
```

## Criteria

Criteria say which rows to read. They are a plain object, keyed by the row's fields:

```ts
{ name: 'Write the docs' }                       // equal to
{ name: { ieq: 'write the docs' } }              // with an operator
{ createdAt: { gte: '2026-01-01', lt: '2026-02-01' } }  // several, all must hold
{ doneAt: null }                                 // the field is empty
{ or: [{ name: 'A' }, { name: 'B' }] }           // any of
{ and: [{ projectId }, { doneAt: null }] }       // all of
```

The operators are those of [filters](/concepts/schemas-and-dtos/#operators):

| Operator | Matches when the value is |
|---|---|
| `eq` | equal to it |
| `ne` | not equal to it |
| `in` | one of a list |
| `gt` / `gte` | greater than / greater than or equal to it |
| `lt` / `lte` | less than / less than or equal to it |
| `ieq` | equal to it, ignoring the case of A to Z |

A field set to `undefined` is ignored, so optional criteria can be written inline. An empty `{}` matches every row.

Use cases rarely write criteria by hand: `TaskFilter.toCriteria(filter)` turns what a client sent into criteria.

Two helpers:

- `allOf(a, b)` returns criteria matching both.
- `matches(row, criteria)` checks one object against criteria in memory.

## Pages

A list that can grow is read one page at a time.

```ts
type PageRequest = { size: number, cursor?: string }
type Page<T> = { items: T[], nextCursor?: string, total?: number }
```

`paginate(criteria, page, options?)` returns up to `page.size` entities after `page.cursor`, and:

- `nextCursor`: the id of the last item, only when there are more. Send it as the next `cursor`.
- `total`: how many match the criteria in all.

Its options are `newestFirst` (`true` reads by id, descending) and `everyScope`.

Over HTTP, `pageRequestFrom(request)` reads `?size=` and `?cursor=` from the URL (see [HTTP and routes](/concepts/http/)).

Helpers for pages:

| Function | What it does |
|---|---|
| `mapPage(page, fn)` | A page with each item mapped. Items mapped to `undefined` are dropped. |
| `toPage(rows, { size, cursor, total? })` | Builds a page from up to `size + 1` rows: the extra row says there is a next page. |
| `allPages(read, size?)` | Calls `read` page after page, 100 at a time by default, and returns every item. |

```ts
const found = await this.tasks.paginate(criteria, page, { newestFirst: true })
return mapPage(found, each => each.toDTO())
```

:::tip
A cursor is better than "page 3": rows added while someone reads do not shift the pages under them.
:::

## Saving

```ts
await this.tasks.persist(task)
await this.tasks.persist([task, another])
```

`persist(entities, hooks?)` saves one entity or a list, all in one transaction:

1. It checks the [write rule](/concepts/use-cases/#the-write-rule).
2. It writes each entity with something to save. A new one is inserted. A changed one updates only its changed fields, `updatedAt` and `version`. A deleted one is deleted.
3. It publishes the events each saved entity tracked, into the queue of jobs kept in the database (the *outbox*), in the same transaction. See [Events and subscriptions](/concepts/events/).

Entities with nothing to save are skipped. If any write fails, the transaction rolls back and nothing is saved.

`purge(criteria)` deletes every matching row at once and returns how many. It builds no entities, checks no versions and publishes no events: keep it for clean-up jobs.

## Save hooks and guards

`persist` takes optional hooks, which run inside its transaction:

| Hook | Runs |
|---|---|
| `before` | Before the writes. |
| `after` | After the writes, before the events. Needs `guard`. |
| `guard` | Names what the hooks protect, as a list of keys. |

A hook that reads must name a guard. Say a project holds at most 100 open tasks:

```ts
await this.tasks.persist(task, {
  guard: [`project:${projectId}`],
  before: async () => {
    if (await this.tasks.count({ projectId, doneAt: null }) >= 100) {
      throw new ProjectFull()
    }
  },
})
```

On Postgres and MySQL, the guard locks those keys until the transaction ends, so two saves for the same project take turns. A save waits up to 30 seconds for a key, then fails with `GuardTimeout`. On SQLite, writes already run one at a time.

:::caution
A save whose hooks read without a guard throws `[guard rule] … reads task in a save that guards nothing`, on every database. Without it, on Postgres another save could change what the hook read before it commits. The context's `guardRule` option (`'error'`, `'warn'` or `'off'`) sets what happens.
:::

## Transactions

Each `persist` is one transaction. A module never opens one itself: the lint rule `module-transactions` refuses any use of the base's `transactions` in a module. To save several entities together, pass them to one `persist`.

`TransactionSpoiled` is thrown when a save that joined a transaction failed, even if its error was caught: the whole transaction rolls back.

## Versions and conflicts

Every row has a `version`. A save updates or deletes a row only if its version is still the one the entity read, and adds one to it.

| Error | When | HTTP |
|---|---|---|
| `StaleVersion` | Someone saved the row since you read it, or deleted it. | `409` |
| `DuplicateValue` | A unique index refused a value. | `409` |
| `TransactionConflict` | Postgres or MySQL refused the transaction (a deadlock, a serialization failure). | `409` |

All three are `ConcurrencyConflict`s, so the [use case runs again](/concepts/use-cases/#retries-on-a-conflict) before the error reaches the client. `DuplicateValue` lists the fields in `params.fields` when the database says which.

:::note
Of the retries, at most one follows a `DuplicateValue` by default (`conflictRetries.duplicates`). A value someone else keeps is usually still taken on the next run.
:::

## References to other rows

`ReferenceNotFound` (`400`, code `reference_not_found`) says an id points to nothing: `The project 0190… does not exist`. Throw it yourself, or use `resolveRefs`, which looks up several ids and throws it for the first missing one:

```ts
const refs = await resolveRefs({ project: projectId }, { project: projectFinder })
// { project: { id, name } }
```

Each finder has `find({ id: [id] })`, returning `{ id, name }` objects. An id given as `null` resolves to `null`.

## Text the database cannot keep

A string holding the NUL character or a lone surrogate cannot be stored as text. Saving one throws `TextWithNul` (`400`, code `text_with_nul`). `unstorable(text)` and `holdsNul(value)` check a value beforehand.

## Scope

A scope keeps a repository to the rows of one owner, such as the current workspace:

```ts
super(base, base.database.records<TaskRow>('task'), {
  scope: { field: 'workspaceId', current: () => currentWorkspaceId() },
})
```

- Every read adds `workspaceId = current()` to its criteria, unless it passes `everyScope: true`.
- `persist` refuses an entity of another scope, before writing.

See [Actor and scope](/concepts/actor-and-scope/) for where the current value comes from.

## Soft delete

With `softDelete: true`, a deleted entity keeps its row: the save sets `deletedAt` (and `updatedAt`) instead of deleting it, and every read skips rows with a `deletedAt`. The table needs a nullable `deleted_at` column.

## Rows and entities

A repository turns rows into entities and back with three protected methods:

| Method | Default |
|---|---|
| `toEntity(row)` | None: you write it. |
| `toRow(entity)` | The entity's fields, for an insert. |
| `toChanges(entity)` | The changed fields and `updatedAt`, for an update. |

Override `toRow` and `toChanges` when the table and the entity differ. `this.records` gives the table itself: `find`, `count`, `countBy`, `insert`, `update`, `delete` and `deleteMany`.

## With the CLI

`newt add module` writes the repository with its module, its entity and its table:

```sh
newt add module tasks/task
```

See [`newt add module`](/reference/cli/add-module/).
