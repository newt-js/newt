---
title: "@newt-js/core"
description: Every class, function and type that @newt-js/core exports, grouped by topic.
sidebar:
  order: 1
---

`@newt-js/core` is the framework itself: the pieces your modules are made of, and the adapters that keep and serve them. Come here for the exact signature or default of anything you import from it; each section links to the page that explains the idea.

## Entry points

| Import from | What it holds |
|---|---|
| `@newt-js/core` | The domain: entities, value objects, use cases, repositories, filters, pages, events, errors, actor, scope, clock, files, modules, observability. |
| `@newt-js/core/application` | What runs the domain: contexts, database and outbox interfaces, platform, logs, worker, schedules, rate limits, the description of an app. |
| `@newt-js/core/application/testing` | Test helpers. See [Testing API](/reference/testing/). |
| `@newt-js/core/http` | The router and the server. See [HTTP API](/reference/http/). |
| `@newt-js/core/database/sqlite` · `/postgres` · `/mysql` · `/memory` | Databases. See [Adapters](#adapters). |
| `@newt-js/core/files/local` · `/s3` · `/memory` | File storage. |
| `@newt-js/core/cluster/memory` · `/valkey` | What several instances share. |

`zod` 4 is a peer dependency.

## Entities

See [Entities](/concepts/entities/).

### `Entity<TSchema, TPublic = TSchema>`

The base class of an entity: data checked by a zod schema, with an id, a version and the events it tracks.

```ts title="src/contexts/tasks/modules/task/task.ts"
export class Task extends Entity<typeof TaskSchema> {
  private constructor(input: EntityInput<TaskDTO>, isNew: boolean) {
    super(TaskSchema, input, isNew)
  }
}
```

| Member | Kind | What it does |
|---|---|---|
| `constructor(schema, input, isNew, publicSchema?)` | protected | Parses `input` with `schema`. A new entity gets an id (UUID v7) when it has none, and `createdAt`/`updatedAt` from the clock. One read from storage needs its `version`. `publicSchema` picks the fields `toDTO()` shows. |
| `id` | getter | The entity's id. |
| `version` | getter | `0` when new; goes up by one on every save. |
| `isNew` | getter | `true` until its first save. |
| `isDeleted` | getter | `true` after `markAsDeleted()`. |
| `hasPendingChanges` | getter | New, marked as deleted, or changed since read. |
| `data` | protected getter | The current fields. |
| `change(partial)` | protected | Sets fields and parses them again. Bumps `updatedAt` when something changed. |
| `markAsDeleted()` | protected | Marks it for deletion at the next save. |
| `trackEvent(event)` | protected | Keeps an event to publish when it is saved. A second event with the same name replaces the first. |
| `getChanges()` | method | The changed fields, or `null`. |
| `getPrevious()` | method | The values those fields had when read, or `null`. |
| `hasChanged(field)` | method | Whether `field` changed (always `true` when new). |
| `toDTO()` | method | A copy of its fields, only the public ones when there is a `publicSchema`. |

Rules the constructor checks on the schema: it names `createdAt` and `updatedAt`, and it does not keep unknown fields (`z.looseObject`, `.catchall`, `.passthrough`). A public schema only has fields of the schema.

:::caution
These checks run when the first entity is built, not at startup. A schema without `createdAt` and `updatedAt`, or made with `z.looseObject`, fails on the first `create` or read.
:::

### Types

| Export | Signature | Meaning |
|---|---|---|
| `EntityInput<T>` | `Omit<T, 'id' \| 'createdAt' \| 'updatedAt'> & { id?, createdAt?, updatedAt?, version? }` | What an entity's constructor takes. |
| `EntitySchema` | `z.ZodObject<{ id, createdAt, updatedAt, … }>` | The shape an entity schema has. |

### Entity errors

Programming mistakes, not answers to a client. All extend `EntityError extends Error`.

| Class | Thrown when |
|---|---|
| `InvalidEntity(entity, id, zodError, field?)` | The data does not pass the schema. |
| `UnknownEntityField(field, reason?)` | `change()` gets a field the schema does not have, or `createdAt`/`updatedAt`. |
| `DeletedEntityNotChangeable` | `change()` on an entity marked as deleted. |
| `EntityAlreadyDeleted` | `markAsDeleted()` twice. |
| `NewEntityNotDeletable` | `markAsDeleted()` on an entity never saved. |
| `EventWithoutChange(entity, id, events)` | Saving an entity that tracked events but changed nothing. |
| `SaveRolledBack(entity, id)` | Saving again an entity whose save rolled back. Read it again. |

## Value objects

See [Value objects](/concepts/value-objects/).

### `defineValueObject(schema, invalid, extra?)`

```ts
defineValueObject<Schema extends z.ZodType, Extra extends object = {}>(
  schema: Schema,
  invalid: (input: z.input<Schema>) => KnownError,
  extra?: Extra,
): {
  schema: Schema
  from(input): z.output<Schema>
  tryFrom(input: unknown): z.output<Schema> | undefined
} & Extra
```

`from` throws what `invalid` returns; `tryFrom` returns `undefined` instead. `extra` adds your own members.

```ts title="src/contexts/tasks/modules/task/value-objects/priority.ts"
export const Priority = defineValueObject(
  z.string().trim().min(1).max(100).brand<'Priority'>(),
  text => new InvalidPriority(text),
)
export type Priority = z.output<typeof Priority.schema>
```

### Built-in value objects

Each is a value (`from`, `tryFrom`, `schema`) and a branded string type of the same name.

| Export | Accepts | Extra members | Error (`code`) |
|---|---|---|---|
| `Uuid`, `uuidFactory(name)` | A UUID v7. | `generate()` | `InvalidUuid` (`invalid_uuid`) |
| `EventId` | A UUID v7, branded `EventId`. | `generate()` | `InvalidUuid` |
| `Key`, `keyFactory(name, pattern?)` | 1–200 of `A-Z a-z 0-9 . _ : -` (or your `pattern`). | — | `InvalidKey` (`invalid_key`) |
| `Email`, `emailFactory()` | An email, trimmed and lower-cased, up to 254 characters. | — | `InvalidEmail` (`invalid_email`) |
| `SearchText`, `searchTextFactory()` | Text, trimmed, up to 100 characters. | — | `InvalidSearchText` (`invalid_search_text`) |
| `SecretToken`, `secretTokenFactory()` | 43 base64url characters (32 random bytes). | `generate()`, `hash(token)` (SHA-256, hex) | `InvalidSecretToken` (`invalid_secret_token`) |

The `*Factory` functions build a new one with its own brand, e.g. `uuidFactory('TaskId')`.

## Use cases

See [Use cases](/concepts/use-cases/).

### `@UseCase(options?)`

A method decorator. It runs the method through the module's `UseCaseRunner`: named `<module>.<method>`, observed, and retried on a concurrency conflict.

```ts
@UseCase()
async create(input: TaskCreateDTO): Promise<TaskDTO> { … }
```

| Option (`UseCaseOptions`) | Default | Meaning |
|---|---|---|
| `retryOnConflict` | `true` | `false` turns off retries for the whole call. Retries happen at the outermost use case, so a use case called by another with `false` stops the outer one retrying too. |

### `UseCaseRunner`

Runs use cases for one context. `ContextBase` makes one; you rarely build it.

| Option (`UseCaseRunnerOptions`) | Default | Meaning |
|---|---|---|
| `context` | `''` | The context's name. |
| `observability` | `noObservability` | Where each run is reported. |
| `writeRule` | `'error'` | A use case that saves another module outside a worker, or two modules in one transaction. |
| `guardRule` | `'error'` | A save that read tables but guards nothing. |
| `clock` | — | The clock its use cases see. |
| `conflictRetries` | `{ times: 3, duplicates: 1, backoffMs: 10 }` | How often to retry on a conflict. |

Members: `run(name, fn, options?)`, `checkWriteRule()`, `checkOneModulePerTransaction(saved)`, `checkGuardRule(tables)`, `registry`, `context`.

### Related exports

| Export | Signature | Meaning |
|---|---|---|
| `UseCaseOptions` | `{ retryOnConflict?: boolean }` | Options of `@UseCase`. |
| `WriteRule`, `GuardRule` | `'off' \| 'warn' \| 'error'` | How a broken rule is reported: ignored, logged once, or thrown. |
| `ConflictRetries` | `{ times, duplicates, backoffMs }` | `times`: retries in all. `duplicates`: how many of them may follow a `DuplicateValue`. `backoffMs`: base wait, random, growing with each try. |
| `DEFAULT_CONFLICT_RETRIES` | `{ times: 3, duplicates: 1, backoffMs: 10 }` | |
| `conflictRetries(given?)` | `(Partial<ConflictRetries>) => ConflictRetries` | Fills defaults and checks the values. |

## Repositories

See [Repositories, filters and pages](/concepts/repositories/).

### `Repository<E, Row, D = RepositoryDeps>`

Reads and saves one kind of entity in one table.

```ts title="src/contexts/tasks/modules/task/task.repository.ts"
export class Task_Repository extends Repository<Task, TaskRow> {
  constructor(base: ContextBase) {
    super(base, base.database.records<TaskRow>('task'), { scope: 'none' })
  }

  protected toEntity(row: TaskRow): Task {
    return Task.fromDTO(row)
  }
}
```

| Member | Signature | What it does |
|---|---|---|
| `constructor` | `(deps: D, records: Records<Row>, options: RepositoryOptions<Row>)` | |
| `toEntity` | `protected abstract (row: Row) => E` | Builds the entity from a row. |
| `toRow` | `protected (entity: E) => NewRow<Row>` | The row to insert. Override to store other columns. |
| `toChanges` | `protected (entity: E) => Partial<NewRow<Row>>` | The columns to update. |
| `find` | `(criteria?, options?: ReadOptions<Row>) => Promise<E[]>` | Entities that match. |
| `count` | `(criteria?, { everyScope? }) => Promise<number>` | How many match. |
| `count` | `(criteria, { by: fields, everyScope? }) => Promise<RowCount[]>` | How many per value of `fields`. |
| `paginate` | `(criteria, page: PageRequest, { newestFirst?, everyScope? }) => Promise<Page<E>>` | One page, by id, with `total`. |
| `persist` | `(entities: E \| E[], hooks?: SaveHooks) => Promise<void>` | Saves new, changed and deleted entities in one transaction, then publishes their events. |
| `purge` | `(criteria) => Promise<number>` | Deletes rows that match, without entities. Returns how many. |

| Option (`RepositoryOptions`) | Default | Meaning |
|---|---|---|
| `scope` | required | `'none'`, or `{ field, current: () => string }`: every read is filtered by `field = current()`, and a save outside it throws. |
| `softDelete` | `false` | A delete sets `deletedAt` instead of removing the row; reads skip those rows. |

`ReadOptions<Row>` is `{ orderBy?: { field, direction?: 'asc' \| 'desc' }[], limit?: number, everyScope?: boolean }`. `everyScope: true` reads past the scope.

`SaveHooks` is `{ before?, after?, guard? }`. `guard` names the keys to lock while saving (on Postgres and MySQL). `after` needs a `guard`.

### `BaseRepository<E, D>`

The base of `Repository`, for repositories that do not map one table. It gives `protected save(entities, write, hooks?)` and `protected saveRows(write, { guard? })`.

### Storage interfaces

What a database adapter offers. You use them through `base.database`.

| Export | Members |
|---|---|
| `Records<Row>` | `find(criteria?, options?)`, `count(criteria?)`, `countBy(criteria, fields)`, `insert(row)`, `update(id, version, changes)`, `delete(id, version)`, `deleteMany(criteria)` |
| `Transactions` | `run(fn)`, `save(fn)`, `guard(keys, { waitMs? })`, `afterRollback(fn)` |
| `RepositoryDeps` | `{ transactions, bus: EventPublisher, useCaseRunner? }`. `ContextBase` is one. |
| `StoredRow` | `{ id: string, version: number }` |
| `NewRow<Row>` | `Omit<Row, 'version'>` |
| `RowCount<Row, K>` | `Pick<Row, K> & { count: number }` |
| `FindOptions<Row>` | `{ orderBy?, limit? }` |
| `RepositoryScope<Row>` | `{ field, current: () => string }` |
| `SaveInProgress` | `{ modules: Set<string>, read: Set<string> }` |
| `GuardOptions` | `{ waitMs?: number }` |

### Storage errors and helpers

| Export | Meaning |
|---|---|
| `TextWithNul` | `ValidationError`, code `text_with_nul`: a value holds a NUL character or a lone surrogate. |
| `holdsNul(value)` | Whether a value (deep) holds such text. |
| `GuardTimeout` | A guard waited `waitMs` for keys another transaction held. |
| `TransactionSpoiled` | A save inside the transaction failed, so the whole transaction rolls back. |

## Filters and criteria

See [Repositories, filters and pages](/concepts/repositories/).

### `defineFilter(fields, limits?)`

Declares which fields a client may filter by, with which operators, and what it may sort by.

```ts title="src/contexts/tasks/modules/task/task.schema.ts"
export const TaskFilter = defineFilter({
  id: { field: 'id', value: TaskId.schema, ops: ['eq', 'in'] },
  name: { field: 'name', value: z.string(), ops: ['eq', 'ieq'] },
}, { sort: ['name', 'createdAt'] })
```

| Limit (`FilterLimits`) | Default | Meaning |
|---|---|---|
| `sort` | `[]` | Fields a list may be sorted by (up to 3 at once). |
| `maxDepth` | `3` | How deep `and`/`or` groups nest. |
| `maxConditions` | `20` | Conditions in one filter. |

An `in` takes up to 100 values. The filter accepts two forms: plain equality (`{ name: 'Write docs' }`, for fields with `eq`) or a tree (`{ field, op, value }`, `{ and: [...] }`, `{ or: [...] }`).

| `Filter` member | What it does |
|---|---|
| `schema` | The zod schema of a filter. |
| `sortSchema` | The zod schema of a sort: `{ field, direction?: 'asc' \| 'desc' }[]`. |
| `parse(input)` | Parses, or throws `InvalidFilter` (code `invalid_filter`). |
| `parseSort(input)` | Parses, or throws `InvalidSort` (code `invalid_sort`). |
| `toCriteria(filter)` | The `Criteria` a repository reads. |
| `toOrder(sort)` | The `orderBy` a repository reads. |
| `fieldOf(name)` | The stored field behind a filter field. |

Types: `Filter`, `FilterField` (`{ field, value: z.ZodType, ops: Operator[] }`), `FilterInput`, `FilterNode`, `FilterEquals`, `FilterLimits`, `FilterIssue` (`{ path, message }`), `Sort<Sortable>`.

### Criteria

What repositories read: an object of fields, each a value (equals) or a `Condition`, plus `and` / `or`.

```ts
await tasks.find({
  name: { ieq: 'write docs' },
  or: [{ id: a }, { id: b }],
})
```

| Operator | Meaning |
|---|---|
| `eq`, `ne` | Equal, not equal. |
| `in` | One of a list. |
| `gt`, `gte`, `lt`, `lte` | Greater / less than. Never true for `null`. |
| `ieq` | Equal, ignoring ASCII case. |

| Export | Signature |
|---|---|
| `Criteria<Row>` | `{ [field]?: value \| Condition } & { and?: Criteria[], or?: Criteria[] }` |
| `Condition<V>` | `{ eq?, ne?, in?, gt?, gte?, lt?, lte?, ieq? }` |
| `Operator` | `keyof Condition` |
| `CriteriaNode` | The tree form: `{ kind: 'all' \| 'any', of }` or `{ kind: 'field', field, condition }` |
| `allOf(a, b)` | Both criteria. |
| `criteriaTree(criteria?)` | Criteria as a `CriteriaNode`. |
| `matches(row, criteria?)` | Whether a row matches, in memory. |

## Pagination

See [Repositories, filters and pages](/concepts/repositories/).

| Export | Signature | Meaning |
|---|---|---|
| `PageRequest` | `{ size: number, cursor?: string }` | What a page asks for. |
| `Page<T>` | `{ items: T[], nextCursor?: string, total?: number }` | One page. No `nextCursor` on the last. |
| `toPage(rows, { size, cursor, total? })` | `=> Page<T>` | Builds a page from `size + 1` rows. |
| `mapPage(page, fn)` | `=> Page<R>` | Maps the items; `undefined` results are dropped. |
| `allPages(read, size = 100)` | `=> Promise<T[]>` | Reads every page and joins the items. |
| `ToPageOptions<T>` | `{ size, cursor: (item) => string, total? }` | |

## Events

See [Events and subscriptions](/concepts/events/).

### `defineEvent(name, schema)`

A class of event. Its payload is parsed by `schema`, which must give back what it takes (no transforms or defaults; brands only on strings and numbers).

```ts title="src/contexts/tasks/modules/task/events/task-completed.ts"
export const Task_Completed = defineEvent(
  'task.completed',
  TaskSchema.pick({ id: true }),
)
```

An instance has `name`, `payload` and `occurredAt` (from the clock).

:::caution
A payload is stored and parsed again when a job runs. A schema with `.transform()` or `.default()` would change it on the way, so `defineEvent` does not type-check with one.
:::

The class has `eventName`. A payload that fails the schema throws `InvalidEvent`.

### `eventsOf(bus, classes)`

Turns event classes into emitters a module offers.

```ts
this.events = eventsOf(base.bus, {
  created: Task_Created,
  completed: Task_Completed,
})
```

### `DomainEventEmitter<TPayload>`

| Member | What it does |
|---|---|
| `name` | The event's name. |
| `subscribe(handler, subscription)` | Calls `handler(payload, meta)` for each event. Returns a function that unsubscribes. |

`Module.on` is the usual way to subscribe; see [Modules](#modules).

### `Subscription`

| Field | Meaning |
|---|---|
| `strategy: 'fire-and-forget'` | Runs in memory after the commit. Lost if the process stops. |
| `strategy: 'handler'` | A job in the outbox, the queue of jobs that lives in your database. Needs `queue`. |
| `queue` | `<module>.<use case>.on.<event name>`. |
| `attempts` | Tries before the job is dead. Default `5`. |
| `when(payload)` | Only events it returns `true` for. |

### Types

| Export | Signature |
|---|---|
| `DomainEvent<T>` | `{ id?, name, payload: T, occurredAt: string, actor?: string \| null }` |
| `PublishedEvent<T>` | `DomainEvent<T> & { id: EventId, actor: string \| null }` |
| `DomainEventClass<T>` | `{ eventName: string, new(payload: T): DomainEvent<T> }` |
| `EventMeta` | `{ id: EventId, name, occurredAt, actor: string \| null, signal?: AbortSignal }` |
| `Json` | Any JSON value. |
| `EventBus` | `EventPublisher & { subscribe(pattern, handler, subscription?) }`. A pattern is a name or `prefix.*`. |
| `EventPublisher` | `{ publish(event) }` |
| `EventHandler` | `(event: PublishedEvent, signal?: AbortSignal) => void \| Promise<void>` |
| `EventSource<T>` | Anything with `subscribe`, like an emitter. |
| `EmittersOf<Classes>` | What `eventsOf` returns. |
| `InvalidEvent` | Error: a payload does not pass its schema. |

## Errors

See [Errors](/concepts/errors/). How each kind maps to an HTTP status is in [HTTP API](/reference/http/).

### `KnownError<P>`

The base of every error a client may see.

| Member | Meaning |
|---|---|
| `kind` | The family: see [Kinds to extend](#kinds-to-extend). |
| `code` | Your stable code, e.g. `task.already_done`. |
| `message` | Human text. |
| `params` | Data for the client. Typed by `P` (`ErrorParams = Record<string, unknown>`). |

```ts title="src/contexts/tasks/modules/task/errors/already-done.ts"
export class AlreadyDone extends ConflictError {
  readonly code = 'task.already_done'

  constructor() {
    super('Already done')
  }
}
```

### Kinds to extend

| Class | `kind` |
|---|---|
| `ValidationError` | `validation` |
| `NotFoundError` | `not_found` |
| `ConflictError` | `conflict` |
| `ForbiddenError` | `forbidden` |
| `UnauthorizedError` | `unauthorized` |
| `ConcurrencyConflict` | `conflict`. Use cases retry on it. |

### Ready-made errors

| Class | `kind` | `code` | `params` |
|---|---|---|---|
| `StaleVersion` | `conflict` (concurrency) | `stale_version` | — |
| `DuplicateValue(fields?)` | `conflict` (concurrency) | `duplicate_value` | `{ fields }` |
| `ReferenceNotFound(resource, id)` | `validation` | `reference_not_found` | `{ resource, id }` |
| `TooManyRequests(limit, retryAfterMs)` | `too_many_requests` | `too_many_requests` | `{ limit, retryAfterSeconds }` |
| `NoActor` | `unauthorized` | `not_signed_in` | — |
| `UploadTooLarge(maxBytes)` | `too_large` | `upload_too_large` | `{ maxBytes }` |

The errors of the built-in value objects, of filters and of `TextWithNul` are `ValidationError`s too.

## Actor

See [Actor and scope](/concepts/actor-and-scope/).

| Export | Signature | Meaning |
|---|---|---|
| `Actor` | `{ userId: string }` | Who runs a use case. |
| `currentActor()` | `() => Actor` | The actor, or throws `NoActor`. |
| `findCurrentActor()` | `() => Actor \| undefined` | The actor, if any. |
| `runAsActor(actor, fn)` | `<T>(Actor, () => T) => T` | Runs `fn` as `actor`. |
| `NoActor` | `UnauthorizedError` | No one is signed in. |

## Scope

See [Actor and scope](/concepts/actor-and-scope/).

| Export | Signature | Meaning |
|---|---|---|
| `defineScope<T>(name)` | `=> Scope<T>` | A value that follows async calls, like the actor does. |
| `Scope<T>` | `{ run(value, fn), get(): T \| undefined }` | |

```ts
const workspace = defineScope<string>('workspace')
workspace.run('acme', () => tasks.find())
```

## Clock

| Export | Signature | Meaning |
|---|---|---|
| `Clock` | `{ now(): Date }` | |
| `now()` | `() => Date` | The time by the clock in scope, else the system's. |
| `systemClock` | `Clock` | The real time. |

Tests change the time with `TestClock`; see [Testing API](/reference/testing/).

## Files

See [Files](/concepts/files/).

A context's storage is `base.storage.private` (`PrivateFiles`) and `base.storage.public` (`PublicFiles`), each under a folder named after the context. Reading one that was not configured throws.

### `Files` (both kinds)

| Member | Signature | What it does |
|---|---|---|
| `put` | `(key, body: Blob \| Uint8Array \| string, { contentType }) => Promise<StoredFile>` | Stores a file. |
| `open` | `(key) => Promise<OpenFile \| null>` | The file with a `stream`. |
| `stat` | `(key) => Promise<StoredFile \| null>` | `{ size, contentType }`. |
| `delete` | `(key) => Promise<void>` | |
| `uploadUrl` | `(key, { expiresIn, contentType, size, maxBytes? }) => Promise<UploadAddress>` | A URL and headers a client uploads to. Throws `UploadTooLarge` past `maxBytes` (default 1 MiB). |
| `verifyUpload` | `(key, { contentType, maxBytes? }) => Promise<UploadRefusal \| null>` | Checks an upload: `'missing'`, `'too_large'`, `'wrong_type'` (by its first bytes), or `null` when fine. |
| `in` | `(prefix) => Files` | The same storage under a sub-folder. |

| Only on | Member | What it does |
|---|---|---|
| `PrivateFiles` | `signedUrl(key, { expiresIn, contentType, filename?, disposition? })` | A download URL that expires. `disposition` is `'attachment'` (default) or `'inline'`. |
| `PublicFiles` | `url(key)` | The file's public URL. |

Keys are names of letters, digits, `.`, `_` and `-`, joined by `/` (each up to 128 characters, 900 in all).

### Types and helpers

| Export | Meaning |
|---|---|
| `StorageOptions` | `{ private?: StorageAdapter, public?: PublicStorageAdapter }`: what `ContextBase` takes. |
| `ContextStorage` | `{ private: PrivateFiles, public: PublicFiles }` |
| `StorageAdapter` | What an adapter implements: `put`, `open`, `head`, `stat`, `delete`, `uploadUrl`, `signedUrl`. |
| `PublicStorageAdapter` | `StorageAdapter & { url(key) }` |
| `StoredFile`, `OpenFile`, `PutOptions`, `UploadAddress`, `UploadAddressOptions`, `UploadUrlOptions`, `DownloadUrlOptions`, `UploadRule`, `UploadRefusal` | The shapes used by `Files` and the adapters. |
| `DEFAULT_MAX_UPLOAD_BYTES` | `1048576` (1 MiB). |
| `assertStorageKey(key)` | Throws when `key` is not a valid key. |
| `mediaType(contentType)` | The type without parameters, lower case. |
| `matchesType(head, contentType)` | Whether the first bytes fit the type. `SNIFF_BYTES` (16) is how many it reads. |
| `contentDisposition(contentType, disposition?, filename?)` | A `Content-Disposition` header. Only images and PDF are shown `inline`. |
| `mayShowInline(contentType)` | Whether a type may be shown `inline`. |

## Modules

See [Contexts and modules](/concepts/contexts-and-modules/).

### `Module`

The base class of a module: a name, its use cases and its subscriptions.

| Member | What it does |
|---|---|
| `constructor(name, useCaseRunner, deps?)` | Registers the module in its context. `deps` are the other modules it uses. |
| `name` | The module's name. |
| `useCaseRunner` | The runner its `@UseCase` methods use. |
| `on(event, useCase, args?, options?)` | Runs `useCase` as a job when `event` happens. `args(payload, meta)` returns the use case's arguments; it can be left out when the use case takes none. |

```ts title="src/contexts/tasks/modules/task/task.workers.ts"
tasks.on(tasks.events.completed, 'notifyAssignee', completed => [
  { id: completed.id },
])
tasks.on(tasks.remindOverdueSchedule, 'remindOverdue')
```

| Option (`ReactionOptions`) | Default | Meaning |
|---|---|---|
| `queue` | `<module>.<useCase>.on.<event>` | The job queue's name. |
| `attempts` | `5` | Tries before the job is dead. |
| `when(payload)` | — | Only events it returns `true` for. |

`Reaction` is the type of `on`'s `args` and `options`.

### References to other modules

| Export | Signature | Meaning |
|---|---|---|
| `Ref` | `{ id: string, name: string }` | A short view of something in another module. |
| `RefQuery` | `{ id: string[] }` | |
| `RefFinder` | `{ find(query: RefQuery): Promise<Ref[]> }` | What a module offers to be referenced. |
| `resolveRefs(ids, finders)` | `=> Promise<Record<K, Ref \| null>>` | Finds each id with its finder. A `null` id gives `null`, an `undefined` one is skipped, a missing one throws `ReferenceNotFound`. |
| `resolve(find, onMissing)` | `=> Promise<T>` | The first result of `find`, or throws `onMissing()`. |

## Observability

See [Logs and observability](/concepts/logs/).

| Export | Signature | Meaning |
|---|---|---|
| `Observability` | `{ useCase(call, run), warn(message, fields) }` | What sees every use case run. |
| `ObservedUseCase` | `{ name, module, context }` | The run being observed. |
| `UseCaseAttempt` | `{ retrying(error, attempt) }` | Told before each retry. |
| `noObservability` | `Observability` | Sees nothing. The default. |

## Contexts

See [Contexts and modules](/concepts/contexts-and-modules/). From `@newt-js/core/application`.

### `ContextBase`

What every module of a context shares.

| Option (`ContextBaseOptions`) | Default | Meaning |
|---|---|---|
| `name` | required | The context's name. No `:`. |
| `platform` | required | The `Platform`. |
| `database` | required | The context's `Database`. |
| `clock` | `systemClock` | |
| `worker` | see [Worker](#worker) | Worker options. |
| `writeRule` | `'error'` | See [Use cases](#use-cases). |
| `guardRule` | `'error'` | See [Use cases](#use-cases). |
| `conflictRetries` | `{ times: 3, duplicates: 1, backoffMs: 10 }` | |
| `storage` | — | `StorageOptions`. |

Members: `name`, `platform`, `clock`, `database`, `transactions`, `useCaseRunner`, `bus` (`ContextBus`), `worker`, `schedules`, `rateLimits`, `storage`, `close()`.

### `BoundedContext<B = ContextBase>`

The base class of `<Name>_Context`.

| Member | What it does |
|---|---|
| `constructor(name, base)` | protected. |
| `name`, `base` | |
| `start()` | Starts the worker and the schedules. |
| `stopWorker(deadlineMs?)` | Stops them; running jobs get until `deadlineMs` (default 10 000). |
| `close()` | Closes the database. |
| `stop()` | `stopWorker()` then `close()`. |

### `ContextBus`

The context's `EventBus`. `publish(event)` puts a job in the outbox for each handler, in the same transaction, and runs fire-and-forget handlers after the commit. `ContextBusParts` is its constructor's input.

## Database and outbox

See [Database and migrations](/concepts/database/) and [Jobs and workers](/concepts/jobs-and-workers/). From `@newt-js/core/application`.

| Export | Members / shape |
|---|---|
| `Database` | `Transactions & { outbox, inTransaction, afterCommit(fn), records(name), close() }` |
| `Outbox` | `add`, `claim`, `renew`, `close`, `retry(id, now)`, `seen`, `purge`, `list(query?)`, `get(id)`, `waiting()`, `depth(now)`, `queues()` |
| `Job` | `{ id, queue, event, status: 'pending' \| 'running' \| 'done' \| 'dead', attempts, runAfter, lockedBy, lockedUntil, lastError, createdAt, updatedAt }` |
| `JobQuery` | `{ status?, after?, limit? }` |
| `JobClosing` | `{ status: 'pending' \| 'done' \| 'dead', lastError, runAfter?, giveBack? }` |
| `JobQueueRegistration` | `{ name, event, attempts }` |
| `QueueDepth` | `{ queue, ready, retrying, running, dead, oldestDueAt }` |

## Platform and logs

See [Logs and observability](/concepts/logs/). From `@newt-js/core/application`.

### `Platform`

What every context of a process shares.

```ts title="src/backend.ts"
const platform = new Platform({ cluster: new MemoryCluster() })
```

| Option (`PlatformOptions`) | Default | Meaning |
|---|---|---|
| `cluster` | required | A `Cluster`. |
| `logger` | `new ConsoleLogger()` | Where log lines go. |
| `observability` | `noObservability` | |

Members: `cluster`, `logger`, `observability`, `useLogger(logger)`, `useObservability(observability)`.

### Logs

| Export | Signature | Meaning |
|---|---|---|
| `log` | `{ debug, info, warn, error }(message, fields?)` | Writes a line to the logger of the platform in scope. |
| `setLogger(logger)` | `(Logger) => void` | The logger for lines written outside any platform. |
| `Logger` | `{ write(line: LogLine): void }` | |
| `LogLine` | `{ at, level, message, fields, context: string \| null }` | |
| `LogLevel` | `'debug' \| 'info' \| 'warn' \| 'error'` | |
| `LogFields` | `Record<string, unknown>` | |
| `ConsoleLogger` | `new ConsoleLogger({ debug? })` | Writes to the console; skips `debug` unless `debug: true`. |

## Cluster

See [Running several instances](/guides/scaling/).

`Cluster` is what instances of one app share: rate-limit counters and the signal that new jobs wait.

| Member | Signature |
|---|---|
| `count` | `(key) => Promise<number>` |
| `increment` | `(key, by, ttlMs) => Promise<number>` |
| `forget` | `(key) => Promise<void>` |
| `publish` | `(channel) => Promise<void>` |
| `subscribe` | `(channel, listener) => () => void` |

## Runtime

From `@newt-js/core/application`.

### Schedules

See [Scheduled tasks](/concepts/schedules/). `base.schedules` is the context's `Schedules`.

| Member | Signature | What it does |
|---|---|---|
| `define` | `(name, cron) => DomainEventEmitter<ScheduleTick>` | A schedule named `<module>.<name>`. Returns an event you subscribe to with `Module.on`. |
| `start()`, `stop()` | | `BoundedContext` calls them. |
| `tick()` | `=> Promise<void>` | Looks once for what is due. |

```ts
this.remindOverdueSchedule = base.schedules.define(
  'task.remindOverdue',
  '0 9 * * *',
)
```

A cron has five fields: minute, hour, day of month, month, day of week (0–7, both 0 and 7 are Sunday). `ScheduleTick` is `{ dueAt: string }`.

### Worker

See [Jobs and workers](/concepts/jobs-and-workers/). `base.worker` is the context's `Worker`.

| Option (`WorkerOptions`) | Default | Meaning |
|---|---|---|
| `concurrency` | `10` | Jobs run at once. |
| `pollMs` | `5000` | How often it looks for jobs. |
| `leaseMs` | `60000` | How long a claimed job is held before another instance may take it. |
| `backoffMs` | `10000` | Wait before the first retry; doubles each time. |
| `maxBackoffMs` | `900000` (15 min) | Longest wait between retries. |
| `keepDoneMs` | `604800000` (7 days) | How long finished jobs are kept. |
| `seenEveryMs` | `60000` | How often it records the queues it serves. |
| `orphansCheckEveryMs` | `seenEveryMs` | How often it warns about queues no one serves. |

`WorkerOptionsGiven` is the same with every field optional.

| Member | What it does |
|---|---|
| `register(queue, pattern, handler, attempts = 5, when?)` | Serves a queue. `Module.on` calls it. |
| `enqueue(event)` | Adds a job per matching queue. Returns the queues. |
| `start()`, `stop(deadlineMs = 10000)`, `wake()`, `idle()` | |
| `runAsWorker(fn)` | Runs `fn` as the worker does. |
| `onFlow(listener)` | Tells each `JobFlow` (`{ queue, kind: 'delivered' \| 'redelivered' \| 'dead', waitMs }`). |
| `state()` | `QueueState[]`: `{ queue, ready, retrying, running, dead, oldestDueAt, lastSeenAt, orphan }`. |
| `dead(after, limit)` | A `Page<DeadJob>`: `{ id, queue, event, attempts, lastError, createdAt, diedAt }`. |

`ABORTED_GRACE_MS` (1000) is how long a job whose signal aborted has to end.

### Rate limits

`base.rateLimits` is the context's `RateLimits`. The HTTP router uses them too; see [HTTP API](/reference/http/).

```ts
const creates = base.rateLimits.define('task.create', {
  limit: 30,
  windowMs: 60_000,
})
await creates.take(currentActor().userId)
```

| Export | Members |
|---|---|
| `RateLimits` | `define(name, rule)`: name is `<module>.<name>`, once each. `counter`. |
| `RateLimit` | `name`, `rule`, `take(key)` (throws `TooManyRequests` when over), `forget(key)` |
| `RateLimitRule` | `{ limit: number, windowMs: number }`, both whole numbers from 1. |
| `RateLimitTake` | `{ allowed, limit, remaining, retryAfterMs }` |

## Description

`describeApplication(contexts)` returns an `ApplicationDescription`: every context, module, use case, event, schedule, dependency and subscription. Tools read it.

| Type | Shape |
|---|---|
| `ApplicationDescription` | `{ version: 1, contexts: ContextDescription[] }` |
| `ContextDescription` | `{ name, uses, modules, subscriptions }` |
| `ModuleDescription` | `{ id, context, name, className, useCases, events, deps }` |
| `UseCaseDescription` | `{ id, name, retryOnConflict }` |
| `EventDescription` | `{ id, name, schedule: { cron } \| null }` |
| `ModuleDependency` | `{ name, kind: 'module', target }`, `{ name, kind: 'events', target, events }` or `{ name, kind: 'port', target: null }` |
| `SubscriptionDescription` | `{ event, strategy, queue, handler, attempts, filtered }` |

## Adapters

Each adapter has its own entry point, so an app only loads what it uses.

### Databases

| Import from | Class | Open with |
|---|---|---|
| `@newt-js/core/database/sqlite` | `SqliteDatabase` | `await SqliteDatabase.open({ path, migrations?, waitTimeoutMs? })` |
| `@newt-js/core/database/postgres` | `PostgresDatabase` | `await PostgresDatabase.open({ url, migrations?, connections?, waitTimeoutMs? })` |
| `@newt-js/core/database/mysql` | `MysqlDatabase` | `await MysqlDatabase.open({ url, migrations?, connections?, waitTimeoutMs? })` |
| `@newt-js/core/database/memory` | `MemoryDatabase` | `new MemoryDatabase()` |

| Option | Default | Meaning |
|---|---|---|
| `path` (SQLite) | required | The file. `':memory:'` uses a temporary file, removed on `close()`. |
| `url` (Postgres, MySQL) | required | The connection URL. |
| `migrations` | — | The folder with your migrations. |
| `connections` | `10` | Pool size. |
| `waitTimeoutMs` | `30000` | How long a transaction or a guard waits for its turn. |

```ts title="src/stores.ts"
return SqliteDatabase.open({
  path:
    Bun.env[`${envOf(context)}_DATABASE`] ?? `data/${context}.sqlite`,
  migrations,
})
```

`open()` connects, applies pending migrations (newt's own, then yours) and checks the database stores text as it must. `connect()` only connects. The SQL databases also have `migrations` (`up()`, `down()`, `status()` → `{ applied, pending, changed }`) and `query(sql, params?)`. These entry points also export `Migrations`, `MigrationStatus`, `TransactionConflict` (a `ConcurrencyConflict`, code `transaction_conflict`), and `SqliteDatabaseOptions` or `SqlServerDatabaseOptions`.

The memory entry point also exports `MemoryOutbox`, `MemoryRecords`, `MemoryTransactions` and its `Staged` type.

### Files

| Import from | Classes | Open with |
|---|---|---|
| `@newt-js/core/files/local` | `LocalStorage`, `LocalPublicStorage` | `await LocalStorage.open({ folder, baseUrl, secret, clock? })` |
| `@newt-js/core/files/s3` | `S3Storage`, `S3PublicStorage` | `await S3Storage.open({ bucket, accessKeyId, secretAccessKey, sessionToken?, region?, endpoint?, virtualHostedStyle? })` |
| `@newt-js/core/files/memory` | `MemoryStorage`, `MemoryPublicStorage` | `new MemoryStorage()` |

| Option | Meaning |
|---|---|
| `folder` (local) | Where files are kept. |
| `baseUrl` (local) | The URL its `handler` is served at. |
| `secret` (local) | Signs URLs. 32 characters or more. |
| `clock` (local) | For URL expiry. Default `systemClock`. |
| `bucket`, `accessKeyId`, `secretAccessKey`, `sessionToken`, `region`, `endpoint`, `virtualHostedStyle` (S3) | The bucket and its credentials. `open()` checks the bucket can be reached. |
| `publicUrl` (`S3PublicStorage` only) | The base URL of public files. |

`LocalStorage` serves its own signed URLs: route `GET` and `PUT` under `baseUrl` to `storage.handler(request)`, as `src/stores.ts` does. `LocalPublicStorage` also serves unsigned `GET`s. `LocalStorageOptions`, `S3StorageOptions` and `S3PublicStorageOptions` are exported.

:::danger
Anyone with the local `secret` can sign URLs to read and write any private file. Keep it out of the repository and use a long random value.
:::

### Cluster

| Import from | Class | Create with |
|---|---|---|
| `@newt-js/core/cluster/memory` | `MemoryCluster` | `new MemoryCluster()`, for one instance. |
| `@newt-js/core/cluster/valkey` | `ValkeyCluster` | `new ValkeyCluster(url?, options?)`, with Bun's `RedisOptions`. Has `close()`. |
