---
title: "@newt-js/core"
description: Todas las clases, funciones y tipos que exporta @newt-js/core, agrupados por tema.
sidebar:
  order: 1
---

`@newt-js/core` es el framework en sí: las piezas con las que haces tus módulos y los adaptadores que los guardan y los sirven. Vuelve aquí para ver la firma o el valor por defecto exactos de lo que importes de él; cada sección enlaza con la página que explica la idea.

## Puntos de entrada

| Importa de | Qué contiene |
|---|---|
| `@newt-js/core` | El dominio: entidades, value objects, casos de uso, repositorios, filtros, páginas, eventos, errores, actor, scope, reloj, ficheros, módulos, observabilidad. |
| `@newt-js/core/application` | Lo que ejecuta el dominio: contextos, interfaces de base de datos y outbox, plataforma, logs, worker, tareas programadas, límites de peticiones, la descripción de una app. |
| `@newt-js/core/application/testing` | Utilidades para tests. Mira la [API de testing](/es/reference/testing/). |
| `@newt-js/core/http` | El router y el servidor. Mira la [API HTTP](/es/reference/http/). |
| `@newt-js/core/database/sqlite` · `/postgres` · `/mysql` · `/memory` | Bases de datos. Mira [Adaptadores](#adaptadores). |
| `@newt-js/core/files/local` · `/s3` · `/memory` | Almacenamiento de ficheros. |
| `@newt-js/core/cluster/memory` · `/valkey` | Lo que comparten varias instancias. |

`zod` 4 es una dependencia peer.

## Entidades

Mira [Entidades](/es/concepts/entities/).

### `Entity<TSchema, TPublic = TSchema, TReferences = {}>`

La clase base de una entidad: datos comprobados por un schema de zod, con un id, una versión y los eventos que registra.

```ts title="src/contexts/tasks/modules/task/task.ts"
export class Task extends Entity<typeof TaskSchema> {
  private constructor(input: EntityInput<TaskDTO>, isNew: boolean) {
    super(TaskSchema, input, isNew)
  }
}
```

| Miembro | Tipo | Qué hace |
|---|---|---|
| `constructor(schema, input, isNew, publicSchema?)` | protected | Valida `input` con `schema`. Una entidad nueva recibe un id (UUID v7) si no lo trae, y `createdAt`/`updatedAt` del reloj. Una leída del almacenamiento necesita su `version`. `publicSchema` elige los campos que muestra `toDTO()`. Con `TReferences`, `input` recibe las entidades que referencia (`customer`) y guarda sus ids (`customerId`). |
| `id` | getter | El id de la entidad. |
| `version` | getter | `0` si es nueva; sube en uno con cada guardado. |
| `isNew` | getter | `true` hasta que se guarda por primera vez. |
| `isDeleted` | getter | `true` tras `markAsDeleted()`. |
| `hasPendingChanges` | getter | Es nueva, está marcada para borrar o ha cambiado desde que se leyó. |
| `data` | getter protected | Los campos actuales. |
| `change(partial)` | protected | Cambia campos y los vuelve a validar. Actualiza `updatedAt` si algo cambió. |
| `markAsDeleted()` | protected | La marca para borrarla en el próximo guardado. |
| `trackEvent(event)` | protected | Guarda un evento para publicarlo al guardar. Un segundo evento con el mismo nombre sustituye al primero. |
| `getChanges()` | método | Los campos cambiados, o `null`. |
| `getPrevious()` | método | Los valores que tenían esos campos al leerla, o `null`. |
| `hasChanged(field)` | método | Si `field` ha cambiado (siempre `true` si es nueva). |
| `toDTO()` | método | Una copia de sus campos, solo los públicos si hay `publicSchema`, con las entidades que referencia en lugar de sus ids. |

Reglas que el constructor comprueba sobre el schema: nombra `createdAt` y `updatedAt`, y no guarda campos desconocidos (`z.looseObject`, `.catchall`, `.passthrough`). Un schema público solo tiene campos del schema.

:::caution
Estas comprobaciones se hacen al construir la primera entidad, no al arrancar. Un schema sin `createdAt` y `updatedAt`, o hecho con `z.looseObject`, falla en el primer `create` o en la primera lectura.
:::

### Tipos

| Export | Firma | Significado |
|---|---|---|
| `EntityInput<T>` | `Omit<T, 'id' \| 'createdAt' \| 'updatedAt'> & { id?, createdAt?, updatedAt?, version? }` | Lo que recibe el constructor de una entidad. |
| `EntitySchema` | `z.ZodObject<{ id, createdAt, updatedAt, … }>` | La forma de un schema de entidad. |

### Errores de entidad

Errores de programación, no respuestas para un cliente. Todos extienden `EntityError extends Error`.

| Clase | Se lanza cuando |
|---|---|
| `InvalidEntity(entity, id, zodError, field?)` | Los datos no pasan el schema. |
| `UnknownEntityField(field, reason?)` | `change()` recibe un campo que el schema no tiene, o `createdAt`/`updatedAt`. |
| `DeletedEntityNotChangeable` | `change()` sobre una entidad marcada para borrar. |
| `EntityAlreadyDeleted` | `markAsDeleted()` dos veces. |
| `NewEntityNotDeletable` | `markAsDeleted()` sobre una entidad que nunca se guardó. |
| `EventWithoutChange(entity, id, events)` | Guardar una entidad que registró eventos pero no cambió nada. |
| `SaveRolledBack(entity, id)` | Volver a guardar una entidad cuyo guardado se deshizo. Léela otra vez. |

## Value objects

Mira [Value objects](/es/concepts/value-objects/).

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

`from` lanza lo que devuelve `invalid`; `tryFrom` devuelve `undefined` en su lugar. `extra` añade tus propios miembros.

```ts title="src/contexts/tasks/modules/task/value-objects/priority.ts"
export const Priority = defineValueObject(
  z.string().trim().min(1).max(100).brand<'Priority'>(),
  text => new InvalidPriority(text),
)
export type Priority = z.output<typeof Priority.schema>
```

### Value objects incluidos

Cada uno es un valor (`from`, `tryFrom`, `schema`) y un tipo string con marca del mismo nombre.

| Export | Acepta | Miembros extra | Error (`code`) |
|---|---|---|---|
| `Uuid`, `uuidFactory(name)` | Un UUID v7. | `generate()` | `InvalidUuid` (`invalid_uuid`) |
| `EventId` | Un UUID v7 con la marca `EventId`. | `generate()` | `InvalidUuid` |
| `Key`, `keyFactory(name, pattern?)` | De 1 a 200 de `A-Z a-z 0-9 . _ : -` (o tu `pattern`). | — | `InvalidKey` (`invalid_key`) |
| `Email`, `emailFactory()` | Un email, sin espacios y en minúsculas, de hasta 254 caracteres. | — | `InvalidEmail` (`invalid_email`) |
| `SearchText`, `searchTextFactory()` | Texto sin espacios a los lados, de hasta 100 caracteres. | — | `InvalidSearchText` (`invalid_search_text`) |
| `SecretToken`, `secretTokenFactory()` | 43 caracteres base64url (32 bytes aleatorios). | `generate()`, `hash(token)` (SHA-256, hex) | `InvalidSecretToken` (`invalid_secret_token`) |

Las funciones `*Factory` crean uno nuevo con su propia marca, p. ej. `uuidFactory('TaskId')`.

## Casos de uso

Mira [Casos de uso](/es/concepts/use-cases/).

### `@UseCase(options?)`

Un decorador de método. Ejecuta el método con el `UseCaseRunner` del módulo: con el nombre `<módulo>.<método>`, observado y reintentado ante un conflicto de concurrencia.

```ts
@UseCase()
async create(input: TaskCreateDTO): Promise<TaskDTO> { … }
```

| Opción (`UseCaseOptions`) | Por defecto | Significado |
|---|---|---|
| `retryOnConflict` | `true` | `false` desactiva los reintentos de toda la llamada. Se reintenta en el caso de uso más externo, así que uno llamado por otro con `false` también impide que el de fuera reintente. |

### `UseCaseRunner`

Ejecuta los casos de uso de un contexto. Lo crea `ContextBase`; rara vez lo construyes tú.

| Opción (`UseCaseRunnerOptions`) | Por defecto | Significado |
|---|---|---|
| `context` | `''` | El nombre del contexto. |
| `observability` | `noObservability` | A quién se informa de cada ejecución. |
| `writeRule` | `'error'` | Un caso de uso que guarda otro módulo fuera de un worker, o dos módulos en una transacción. |
| `guardRule` | `'error'` | Un guardado que leyó tablas pero no protege nada. |
| `clock` | — | El reloj que ven sus casos de uso. |
| `conflictRetries` | `{ times: 3, duplicates: 1, backoffMs: 10 }` | Cuántas veces reintentar ante un conflicto. |

Miembros: `run(name, fn, options?)`, `checkWriteRule()`, `checkOneModulePerTransaction(saved)`, `checkGuardRule(tables)`, `registry`, `context`.

### Exports relacionados

| Export | Firma | Significado |
|---|---|---|
| `UseCaseOptions` | `{ retryOnConflict?: boolean }` | Opciones de `@UseCase`. |
| `WriteRule`, `GuardRule` | `'off' \| 'warn' \| 'error'` | Qué pasa si se rompe una regla: nada, un aviso en el log una vez, o un error. |
| `ConflictRetries` | `{ times, duplicates, backoffMs }` | `times`: reintentos en total. `duplicates`: cuántos pueden seguir a un `DuplicateValue`. `backoffMs`: espera base, aleatoria, que crece en cada intento. |
| `DEFAULT_CONFLICT_RETRIES` | `{ times: 3, duplicates: 1, backoffMs: 10 }` | |
| `conflictRetries(given?)` | `(Partial<ConflictRetries>) => ConflictRetries` | Rellena los valores por defecto y los comprueba. |

## Repositorios

Mira [Repositorios, filtros y páginas](/es/concepts/repositories/).

### `Repository<E, Row, D = RepositoryDeps>`

Lee y guarda un tipo de entidad en una tabla.

```ts title="src/contexts/tasks/modules/task/task.repository.ts"
export class Task_Repository extends Repository<Task, TaskRow> {
  constructor(base: ContextBase) {
    super(base, base.database.records<TaskRow>('task'), { scope: 'none' })
  }

  protected toEntity(row: ResolvedRow<TaskRow, Task>): Task {
    return Task.fromDTO(row)
  }
}
```

| Miembro | Firma | Qué hace |
|---|---|---|
| `constructor` | `(deps: D, records: Records<Row>, options: RepositoryOptions<Row, ReferencesOf<E>>)` | |
| `toEntity` | `protected abstract (row: ResolvedRow<Row, E>) => E` | Construye la entidad a partir de una fila, con las entidades que referencia su entidad en lugar de sus ids. |
| `toRow` | `protected (entity: E) => NewRow<Row>` | La fila que se inserta. Sobrescríbelo para guardar otras columnas. |
| `toChanges` | `protected (entity: E) => Partial<NewRow<Row>>` | Las columnas que se actualizan. |
| `find` | `(criteria?, options?: ReadOptions<Row>) => Promise<E[]>` | Las entidades que cumplen los criterios. |
| `count` | `(criteria?, { everyScope? }) => Promise<number>` | Cuántas los cumplen. |
| `count` | `(criteria, { by: fields, everyScope? }) => Promise<RowCount[]>` | Cuántas por cada valor de `fields`. |
| `paginate` | `(criteria, page: PageRequest, { newestFirst?, everyScope? }) => Promise<Page<E>>` | Una página, por id, con `total`. |
| `persist` | `(entities: E \| E[], hooks?: SaveHooks) => Promise<void>` | Guarda las entidades nuevas, cambiadas y borradas en una transacción, y luego publica sus eventos. |
| `purge` | `(criteria) => Promise<number>` | Borra las filas que cumplen los criterios, sin entidades. Devuelve cuántas. |

| Opción (`RepositoryOptions`) | Por defecto | Significado |
|---|---|---|
| `scope` | obligatoria | `'none'`, o `{ field, current: () => string }`: cada lectura se filtra por `field = current()`, y guardar fuera de él lanza un error. |
| `softDelete` | `false` | Borrar pone `deletedAt` en vez de quitar la fila; las lecturas se saltan esas filas. |
| `references` | obligatoria cuando su entidad tiene referencias | `Loads<References>`: cómo se carga cada entidad que referencia su entidad. Cada lectura las resuelve, una vez por referencia para todas sus filas. Ver [Referencias a otros módulos](/es/concepts/repositories/#referencias-a-otros-módulos). |

`ReadOptions<Row>` es `{ orderBy?: { field, direction?: 'asc' \| 'desc' }[], limit?: number, everyScope?: boolean }`. `everyScope: true` lee más allá del scope.

`SaveHooks` es `{ before?, after?, guard? }`. `guard` nombra las claves que se bloquean mientras se guarda (en Postgres y MySQL). `after` necesita un `guard`.

### `BaseRepository<E, D>`

La base de `Repository`, para repositorios que no corresponden a una tabla. Da `protected save(entities, write, hooks?)` y `protected saveRows(write, { guard? })`.

### Interfaces de almacenamiento

Lo que ofrece un adaptador de base de datos. Las usas a través de `base.database`.

| Export | Miembros |
|---|---|
| `Records<Row>` | `find(criteria?, options?)`, `count(criteria?)`, `countBy(criteria, fields)`, `insert(row)`, `update(id, version, changes)`, `delete(id, version)`, `deleteMany(criteria)` |
| `Transactions` | `run(fn)`, `save(fn)`, `guard(keys, { waitMs? })`, `afterRollback(fn)` |
| `RepositoryDeps` | `{ transactions, bus: EventPublisher, useCaseRunner? }`. `ContextBase` lo es. |
| `StoredRow` | `{ id: string, version: number }` |
| `NewRow<Row>` | `Omit<Row, 'version'>` |
| `RowCount<Row, K>` | `Pick<Row, K> & { count: number }` |
| `FindOptions<Row>` | `{ orderBy?, limit? }` |
| `RepositoryScope<Row>` | `{ field, current: () => string }` |
| `SaveInProgress` | `{ modules: Set<string>, read: Set<string> }` |
| `GuardOptions` | `{ waitMs?: number }` |

### Errores y utilidades de almacenamiento

| Export | Significado |
|---|---|
| `TextWithNul` | `ValidationError`, code `text_with_nul`: un valor tiene un carácter NUL o un surrogate suelto. |
| `holdsNul(value)` | Si un valor (en profundidad) tiene ese texto. |
| `GuardTimeout` | Un guard esperó `waitMs` por claves que tenía otra transacción. |
| `TransactionSpoiled` | Falló un guardado dentro de la transacción, así que se deshace entera. |

## Filtros y criterios

Mira [Repositorios, filtros y páginas](/es/concepts/repositories/).

### `defineFilter(fields, limits?)`

Declara por qué campos puede filtrar un cliente, con qué operadores, y por qué puede ordenar.

```ts title="src/contexts/tasks/modules/task/task.schema.ts"
export const TaskFilter = defineFilter({
  id: { field: 'id', value: TaskId.schema, ops: ['eq', 'in'] },
  name: { field: 'name', value: z.string(), ops: ['eq', 'ieq'] },
}, { sort: ['name', 'createdAt'] })
```

| Límite (`FilterLimits`) | Por defecto | Significado |
|---|---|---|
| `sort` | `[]` | Campos por los que se puede ordenar una lista (hasta 3 a la vez). |
| `maxDepth` | `3` | Cuántos niveles de grupos `and`/`or` se anidan. |
| `maxConditions` | `20` | Condiciones en un filtro. |

Un `in` admite hasta 100 valores. El filtro acepta dos formas: igualdad simple (`{ name: 'Escribir la doc' }`, para campos con `eq`) o un árbol (`{ field, op, value }`, `{ and: [...] }`, `{ or: [...] }`).

| Miembro de `Filter` | Qué hace |
|---|---|
| `schema` | El schema de zod de un filtro. |
| `sortSchema` | El schema de zod de un orden: `{ field, direction?: 'asc' \| 'desc' }[]`. |
| `parse(input)` | Valida, o lanza `InvalidFilter` (code `invalid_filter`). |
| `parseSort(input)` | Valida, o lanza `InvalidSort` (code `invalid_sort`). |
| `toCriteria(filter)` | Los `Criteria` que lee un repositorio. |
| `toOrder(sort)` | El `orderBy` que lee un repositorio. |
| `fieldOf(name)` | El campo guardado detrás de un campo del filtro. |

Tipos: `Filter`, `FilterField` (`{ field, value: z.ZodType, ops: Operator[] }`), `FilterInput`, `FilterNode`, `FilterEquals`, `FilterLimits`, `FilterIssue` (`{ path, message }`), `Sort<Sortable>`.

### Criterios

Lo que leen los repositorios: un objeto de campos, cada uno un valor (igual a) o una `Condition`, más `and` / `or`.

```ts
await tasks.find({
  name: { ieq: 'escribir la doc' },
  or: [{ id: a }, { id: b }],
})
```

| Operador | Significado |
|---|---|
| `eq`, `ne` | Igual, distinto. |
| `in` | Uno de una lista. |
| `gt`, `gte`, `lt`, `lte` | Mayor / menor que. Nunca se cumple con `null`. |
| `ieq` | Igual, sin distinguir mayúsculas ASCII. |

| Export | Firma |
|---|---|
| `Criteria<Row>` | `{ [campo]?: valor \| Condition } & { and?: Criteria[], or?: Criteria[] }` |
| `Condition<V>` | `{ eq?, ne?, in?, gt?, gte?, lt?, lte?, ieq? }` |
| `Operator` | `keyof Condition` |
| `CriteriaNode` | La forma de árbol: `{ kind: 'all' \| 'any', of }` o `{ kind: 'field', field, condition }` |
| `allOf(a, b)` | Ambos criterios. |
| `criteriaTree(criteria?)` | Los criterios como `CriteriaNode`. |
| `matches(row, criteria?)` | Si una fila los cumple, en memoria. |

## Paginación

Mira [Repositorios, filtros y páginas](/es/concepts/repositories/).

| Export | Firma | Significado |
|---|---|---|
| `PageRequest` | `{ size: number, cursor?: string }` | Lo que pide una página. |
| `Page<T>` | `{ items: T[], nextCursor?: string, total?: number }` | Una página. La última no tiene `nextCursor`. |
| `toPage(rows, { size, cursor, total? })` | `=> Page<T>` | Construye una página a partir de `size + 1` filas. |
| `mapPage(page, fn)` | `=> Page<R>` | Transforma los elementos; los resultados `undefined` se descartan. |
| `allPages(read, size = 100)` | `=> Promise<T[]>` | Lee todas las páginas y une los elementos. |
| `ToPageOptions<T>` | `{ size, cursor: (item) => string, total? }` | |

## Eventos

Mira [Eventos y suscripciones](/es/concepts/events/).

### `defineEvent(name, schema)`

Una clase de evento. Su payload lo valida `schema`, que debe devolver lo mismo que recibe (sin transformaciones ni valores por defecto; marcas solo sobre strings y números).

```ts title="src/contexts/tasks/modules/task/events/task-completed.ts"
export const Task_Completed = defineEvent(
  'task.completed',
  TaskSchema.pick({ id: true }),
)
```

Una instancia tiene `name`, `payload` y `occurredAt` (del reloj).

:::caution
El payload se guarda y se vuelve a validar cuando se ejecuta un job. Un schema con `.transform()` o `.default()` lo cambiaría por el camino, así que `defineEvent` no compila con uno así.
:::

La clase tiene `eventName`. Un payload que no pasa el schema lanza `InvalidEvent`.

### `eventsOf(bus, classes)`

Convierte clases de evento en los emisores que ofrece un módulo.

```ts
this.events = eventsOf(base.bus, {
  created: Task_Created,
  completed: Task_Completed,
})
```

### `DomainEventEmitter<TPayload>`

| Miembro | Qué hace |
|---|---|
| `name` | El nombre del evento. |
| `subscribe(handler, subscription)` | Llama a `handler(payload, meta)` con cada evento. Devuelve una función que cancela la suscripción. |

Lo habitual es suscribirse con `Module.on`; mira [Módulos](#módulos).

### `Subscription`

| Campo | Significado |
|---|---|
| `strategy: 'fire-and-forget'` | Se ejecuta en memoria tras el commit. Se pierde si el proceso se para. |
| `strategy: 'handler'` | Un job en el outbox, la cola de jobs que vive en tu base de datos. Necesita `queue`. |
| `queue` | `<módulo>.<caso de uso>.on.<nombre del evento>`. |
| `attempts` | Intentos antes de que el job quede muerto. Por defecto `5`. |
| `when(payload)` | Solo los eventos para los que devuelve `true`. |

### Tipos

| Export | Firma |
|---|---|
| `DomainEvent<T>` | `{ id?, name, payload: T, occurredAt: string, actor?: string \| null }` |
| `PublishedEvent<T>` | `DomainEvent<T> & { id: EventId, actor: string \| null }` |
| `DomainEventClass<T>` | `{ eventName: string, new(payload: T): DomainEvent<T> }` |
| `EventMeta` | `{ id: EventId, name, occurredAt, actor: string \| null, signal?: AbortSignal }` |
| `Json` | Cualquier valor JSON. |
| `EventBus` | `EventPublisher & { subscribe(pattern, handler, subscription?) }`. Un patrón es un nombre o `prefijo.*`. |
| `EventPublisher` | `{ publish(event) }` |
| `EventHandler` | `(event: PublishedEvent, signal?: AbortSignal) => void \| Promise<void>` |
| `EventSource<T>` | Cualquier cosa con `subscribe`, como un emisor. |
| `EmittersOf<Classes>` | Lo que devuelve `eventsOf`. |
| `InvalidEvent` | Error: un payload no pasa su schema. |

## Errores

Mira [Errores](/es/concepts/errors/). Qué código HTTP corresponde a cada tipo está en la [API HTTP](/es/reference/http/).

### `KnownError<P>`

La base de todo error que puede ver un cliente.

| Miembro | Significado |
|---|---|
| `kind` | La familia: mira [Tipos que puedes extender](#tipos-que-puedes-extender). |
| `code` | Tu código estable, p. ej. `task.already_done`. |
| `message` | Texto para personas. |
| `params` | Datos para el cliente. Tipados por `P` (`ErrorParams = Record<string, unknown>`). |

```ts title="src/contexts/tasks/modules/task/errors/already-done.ts"
export class AlreadyDone extends ConflictError {
  readonly code = 'task.already_done'

  constructor() {
    super('Already done')
  }
}
```

### Tipos que puedes extender

| Clase | `kind` |
|---|---|
| `ValidationError` | `validation` |
| `NotFoundError` | `not_found` |
| `ConflictError` | `conflict` |
| `ForbiddenError` | `forbidden` |
| `UnauthorizedError` | `unauthorized` |
| `ConcurrencyConflict` | `conflict`. Los casos de uso reintentan con él. |

### Errores ya hechos

| Clase | `kind` | `code` | `params` |
|---|---|---|---|
| `StaleVersion` | `conflict` (concurrencia) | `stale_version` | — |
| `DuplicateValue(fields?)` | `conflict` (concurrencia) | `duplicate_value` | `{ fields }` |
| `ReferenceNotFound(resource, id)` | `validation` | `reference_not_found` | `{ resource, id }` |
| `TooManyRequests(limit, retryAfterMs)` | `too_many_requests` | `too_many_requests` | `{ limit, retryAfterSeconds }` |
| `NoActor` | `unauthorized` | `not_signed_in` | — |
| `UploadTooLarge(maxBytes)` | `too_large` | `upload_too_large` | `{ maxBytes }` |

Los errores de los value objects incluidos, de los filtros y `TextWithNul` también son `ValidationError`.

## Actor

Mira [Actor y scope](/es/concepts/actor-and-scope/).

| Export | Firma | Significado |
|---|---|---|
| `Actor` | `{ userId: string }` | Quién ejecuta un caso de uso. |
| `currentActor()` | `() => Actor` | El actor, o lanza `NoActor`. |
| `findCurrentActor()` | `() => Actor \| undefined` | El actor, si lo hay. |
| `runAsActor(actor, fn)` | `<T>(Actor, () => T) => T` | Ejecuta `fn` como `actor`. |
| `NoActor` | `UnauthorizedError` | No hay nadie con la sesión iniciada. |

## Scope

Mira [Actor y scope](/es/concepts/actor-and-scope/).

| Export | Firma | Significado |
|---|---|---|
| `defineScope<T>(name)` | `=> Scope<T>` | Un valor que acompaña a las llamadas asíncronas, como hace el actor. |
| `Scope<T>` | `{ run(value, fn), get(): T \| undefined }` | |

```ts
const workspace = defineScope<string>('workspace')
workspace.run('acme', () => tasks.find())
```

## Reloj

| Export | Firma | Significado |
|---|---|---|
| `Clock` | `{ now(): Date }` | |
| `now()` | `() => Date` | La hora según el reloj del scope, o la del sistema. |
| `systemClock` | `Clock` | La hora real. |

Los tests cambian la hora con `TestClock`; mira la [API de testing](/es/reference/testing/).

## Ficheros

Mira [Ficheros](/es/concepts/files/).

El almacenamiento de un contexto es `base.storage.private` (`PrivateFiles`) y `base.storage.public` (`PublicFiles`), cada uno dentro de una carpeta con el nombre del contexto. Leer uno que no se configuró lanza un error.

### `Files` (los dos tipos)

| Miembro | Firma | Qué hace |
|---|---|---|
| `put` | `(key, body: Blob \| Uint8Array \| string, { contentType }) => Promise<StoredFile>` | Guarda un fichero. |
| `open` | `(key) => Promise<OpenFile \| null>` | El fichero con un `stream`. |
| `stat` | `(key) => Promise<StoredFile \| null>` | `{ size, contentType }`. |
| `delete` | `(key) => Promise<void>` | |
| `uploadUrl` | `(key, { expiresIn, contentType, size, maxBytes? }) => Promise<UploadAddress>` | Una URL y cabeceras a las que sube un cliente. Lanza `UploadTooLarge` si pasa de `maxBytes` (por defecto 1 MiB). |
| `verifyUpload` | `(key, { contentType, maxBytes? }) => Promise<UploadRefusal \| null>` | Comprueba una subida: `'missing'`, `'too_large'`, `'wrong_type'` (por sus primeros bytes), o `null` si está bien. |
| `in` | `(prefix) => Files` | El mismo almacenamiento dentro de una subcarpeta. |

| Solo en | Miembro | Qué hace |
|---|---|---|
| `PrivateFiles` | `signedUrl(key, { expiresIn, contentType, filename?, disposition? })` | Una URL de descarga que caduca. `disposition` es `'attachment'` (por defecto) o `'inline'`. |
| `PublicFiles` | `url(key)` | La URL pública del fichero. |

Las claves son nombres de letras, dígitos, `.`, `_` y `-`, unidos por `/` (cada uno de hasta 128 caracteres, 900 en total).

### Tipos y utilidades

| Export | Significado |
|---|---|
| `StorageOptions` | `{ private?: StorageAdapter, public?: PublicStorageAdapter }`: lo que recibe `ContextBase`. |
| `ContextStorage` | `{ private: PrivateFiles, public: PublicFiles }` |
| `StorageAdapter` | Lo que implementa un adaptador: `put`, `open`, `head`, `stat`, `delete`, `uploadUrl`, `signedUrl`. |
| `PublicStorageAdapter` | `StorageAdapter & { url(key) }` |
| `StoredFile`, `OpenFile`, `PutOptions`, `UploadAddress`, `UploadAddressOptions`, `UploadUrlOptions`, `DownloadUrlOptions`, `UploadRule`, `UploadRefusal` | Las formas que usan `Files` y los adaptadores. |
| `DEFAULT_MAX_UPLOAD_BYTES` | `1048576` (1 MiB). |
| `assertStorageKey(key)` | Lanza un error si `key` no es una clave válida. |
| `mediaType(contentType)` | El tipo sin parámetros, en minúsculas. |
| `matchesType(head, contentType)` | Si los primeros bytes encajan con el tipo. `SNIFF_BYTES` (16) es cuántos lee. |
| `contentDisposition(contentType, disposition?, filename?)` | Una cabecera `Content-Disposition`. Solo las imágenes y los PDF se muestran `inline`. |
| `mayShowInline(contentType)` | Si un tipo se puede mostrar `inline`. |

## Módulos

Mira [Contextos y módulos](/es/concepts/contexts-and-modules/).

### `Module`

La clase base de un módulo: un nombre, sus casos de uso y sus suscripciones.

| Miembro | Qué hace |
|---|---|
| `constructor(name, useCaseRunner, deps?)` | Registra el módulo en su contexto. `deps` son los otros módulos que usa. |
| `name` | El nombre del módulo. |
| `useCaseRunner` | El runner que usan sus métodos `@UseCase`. |
| `on(event, useCase, args?, options?)` | Ejecuta `useCase` como job cuando ocurre `event`. `args(payload, meta)` devuelve los argumentos del caso de uso; puedes omitirlo si el caso de uso no recibe ninguno. |

```ts title="src/contexts/tasks/modules/task/task.workers.ts"
tasks.on(tasks.events.completed, 'notifyAssignee', completed => [
  { id: completed.id },
])
tasks.on(tasks.remindOverdueSchedule, 'remindOverdue')
```

| Opción (`ReactionOptions`) | Por defecto | Significado |
|---|---|---|
| `queue` | `<módulo>.<casoDeUso>.on.<evento>` | El nombre de la cola de jobs. |
| `attempts` | `5` | Intentos antes de que el job quede muerto. |
| `when(payload)` | — | Solo los eventos para los que devuelve `true`. |

`Reaction` es el tipo de los `args` y `options` de `on`.

### Referencias a otros módulos

| Export | Firma | Significado |
|---|---|---|
| `References` | `{ [<nombre>Id]: DTO, [lista]: References }` | Lo que referencia una entidad, como un tipo normal: `{ customerId: CustomerDTO, lines: { productId: ProductDTO } }`. |
| `Resolved<T, S>` | | Un `T` con cada `<nombre>Id` referenciado cambiado por la entidad que nombra, `<nombre>`: `null` solo donde el id puede faltar. |
| `Loads<S>` | `{ [<nombre>Id]: (ids) => Promise<DTO[]>, [lista]: Loads }` | Cómo se cargan las referencias `S`: el `find({ field: 'id', op: 'in', value: ids })` del otro módulo. |
| `resolveReference(items, loads)` | `=> Promise<Resolved<T, S>[]>` | Cambia cada `<nombre>Id` de los items, y de las listas que tienen, por la entidad que nombra, cargando cada referencia una vez para toda la lista, 100 ids cada vez. Un id `null` o ausente da `null`; uno que no nombra nada lanza `ReferenceNotFound`. Los repositorios resuelven sus lecturas con él. |
| `referenced(entities, id, name)` | `=> T` | La entidad de `entities` con ese id, o `ReferenceNotFound` nombrándola: cómo un caso de uso toma lo que referencia su entrada de lo que dio el `find` del otro módulo. |

## Observabilidad

Mira [Logs y observabilidad](/es/concepts/logs/).

| Export | Firma | Significado |
|---|---|---|
| `Observability` | `{ useCase(call, run), warn(message, fields) }` | Lo que ve cada ejecución de un caso de uso. |
| `ObservedUseCase` | `{ name, module, context }` | La ejecución observada. |
| `UseCaseAttempt` | `{ retrying(error, attempt) }` | Se le avisa antes de cada reintento. |
| `noObservability` | `Observability` | No ve nada. El valor por defecto. |

## Contextos

Mira [Contextos y módulos](/es/concepts/contexts-and-modules/). De `@newt-js/core/application`.

### `ContextBase`

Lo que comparten todos los módulos de un contexto.

| Opción (`ContextBaseOptions`) | Por defecto | Significado |
|---|---|---|
| `name` | obligatoria | El nombre del contexto. Sin `:`. |
| `platform` | obligatoria | La `Platform`. |
| `database` | obligatoria | La `Database` del contexto. |
| `clock` | `systemClock` | |
| `worker` | mira [Worker](#worker) | Opciones del worker. |
| `writeRule` | `'error'` | Mira [Casos de uso](#casos-de-uso). |
| `guardRule` | `'error'` | Mira [Casos de uso](#casos-de-uso). |
| `conflictRetries` | `{ times: 3, duplicates: 1, backoffMs: 10 }` | |
| `storage` | — | `StorageOptions`. |

Miembros: `name`, `platform`, `clock`, `database`, `transactions`, `useCaseRunner`, `bus` (`ContextBus`), `worker`, `schedules`, `rateLimits`, `storage`, `close()`.

### `BoundedContext<B = ContextBase>`

La clase base de `<Nombre>_Context`.

| Miembro | Qué hace |
|---|---|
| `constructor(name, base)` | protected. |
| `name`, `base` | |
| `start()` | Arranca el worker y las tareas programadas. |
| `stopWorker(deadlineMs?)` | Los para; los jobs en marcha tienen hasta `deadlineMs` (por defecto 10 000). |
| `close()` | Cierra la base de datos. |
| `stop()` | `stopWorker()` y luego `close()`. |

### `ContextBus`

El `EventBus` del contexto. `publish(event)` mete un job en el outbox por cada handler, en la misma transacción, y ejecuta los handlers fire-and-forget tras el commit. `ContextBusParts` es lo que recibe su constructor.

## Base de datos y outbox

Mira [Base de datos y migraciones](/es/concepts/database/) y [Jobs y workers](/es/concepts/jobs-and-workers/). De `@newt-js/core/application`.

| Export | Miembros / forma |
|---|---|
| `Database` | `Transactions & { outbox, inTransaction, afterCommit(fn), records(name), close() }` |
| `Outbox` | `add`, `claim`, `renew`, `close`, `retry(id, now)`, `seen`, `purge`, `list(query?)`, `get(id)`, `waiting()`, `depth(now)`, `queues()` |
| `Job` | `{ id, queue, event, status: 'pending' \| 'running' \| 'done' \| 'dead', attempts, runAfter, lockedBy, lockedUntil, lastError, createdAt, updatedAt }` |
| `JobQuery` | `{ status?, after?, limit? }` |
| `JobClosing` | `{ status: 'pending' \| 'done' \| 'dead', lastError, runAfter?, giveBack? }` |
| `JobQueueRegistration` | `{ name, event, attempts }` |
| `QueueDepth` | `{ queue, ready, retrying, running, dead, oldestDueAt }` |

## Plataforma y logs

Mira [Logs y observabilidad](/es/concepts/logs/). De `@newt-js/core/application`.

### `Platform`

Lo que comparten todos los contextos de un proceso.

```ts title="src/backend.ts"
const platform = new Platform()
```

| Opción (`PlatformOptions`) | Por defecto | Significado |
|---|---|---|
| `cluster` | `new MemoryCluster()` | Un `Cluster`. |
| `logger` | `new ConsoleLogger()` | Adónde van las líneas de log. |
| `observability` | `noObservability` | |

Miembros: `cluster`, `logger`, `observability`, `useLogger(logger)`, `useObservability(observability)`.

### Logs

| Export | Firma | Significado |
|---|---|---|
| `log` | `{ debug, info, warn, error }(message, fields?)` | Escribe una línea en el logger de la plataforma del scope. |
| `setLogger(logger)` | `(Logger) => void` | El logger de las líneas escritas fuera de cualquier plataforma. |
| `Logger` | `{ write(line: LogLine): void }` | |
| `LogLine` | `{ at, level, message, fields, context: string \| null }` | |
| `LogLevel` | `'debug' \| 'info' \| 'warn' \| 'error'` | |
| `LogFields` | `Record<string, unknown>` | |
| `ConsoleLogger` | `new ConsoleLogger({ debug? })` | Escribe en la consola; se salta `debug` salvo con `debug: true`. |

## Clúster

Mira [Varias instancias](/es/guides/scaling/).

`Cluster` es lo que comparten las instancias de una app: los contadores de límites de peticiones y el aviso de que hay jobs nuevos.

| Miembro | Firma |
|---|---|
| `count` | `(key) => Promise<number>` |
| `increment` | `(key, by, ttlMs) => Promise<number>` |
| `forget` | `(key) => Promise<void>` |
| `publish` | `(channel) => Promise<void>` |
| `subscribe` | `(channel, listener) => () => void` |

## Runtime

De `@newt-js/core/application`.

### Tareas programadas

Mira [Tareas programadas](/es/concepts/schedules/). `base.schedules` es el `Schedules` del contexto.

| Miembro | Firma | Qué hace |
|---|---|---|
| `define` | `(name, cron) => DomainEventEmitter<ScheduleTick>` | Una tarea programada llamada `<módulo>.<nombre>`. Devuelve un evento al que te suscribes con `Module.on`. |
| `start()`, `stop()` | | Los llama `BoundedContext`. |
| `tick()` | `=> Promise<void>` | Mira una vez qué toca. |

```ts
this.remindOverdueSchedule = base.schedules.define(
  'task.remindOverdue',
  '0 9 * * *',
)
```

Un cron tiene cinco campos: minuto, hora, día del mes, mes, día de la semana (0–7; 0 y 7 son domingo). `ScheduleTick` es `{ dueAt: string }`.

### Worker

Mira [Jobs y workers](/es/concepts/jobs-and-workers/). `base.worker` es el `Worker` del contexto.

| Opción (`WorkerOptions`) | Por defecto | Significado |
|---|---|---|
| `concurrency` | `10` | Jobs a la vez. |
| `pollMs` | `5000` | Cada cuánto busca jobs. |
| `leaseMs` | `60000` | Cuánto tiempo retiene un job reclamado antes de que otra instancia pueda cogerlo. |
| `backoffMs` | `10000` | Espera antes del primer reintento; se duplica cada vez. |
| `maxBackoffMs` | `900000` (15 min) | Espera máxima entre reintentos. |
| `keepDoneMs` | `604800000` (7 días) | Cuánto se guardan los jobs terminados. |
| `seenEveryMs` | `60000` | Cada cuánto anota las colas que atiende. |
| `orphansCheckEveryMs` | `seenEveryMs` | Cada cuánto avisa de colas que nadie atiende. |

`WorkerOptionsGiven` es lo mismo con todos los campos opcionales.

| Miembro | Qué hace |
|---|---|
| `register(queue, pattern, handler, attempts = 5, when?)` | Atiende una cola. Lo llama `Module.on`. |
| `enqueue(event)` | Añade un job por cada cola que encaja. Devuelve las colas. |
| `start()`, `stop(deadlineMs = 10000)`, `wake()`, `idle()` | |
| `runAsWorker(fn)` | Ejecuta `fn` como lo hace el worker. |
| `onFlow(listener)` | Avisa de cada `JobFlow` (`{ queue, kind: 'delivered' \| 'redelivered' \| 'dead', waitMs }`). |
| `state()` | `QueueState[]`: `{ queue, ready, retrying, running, dead, oldestDueAt, lastSeenAt, orphan }`. |
| `dead(after, limit)` | Una `Page<DeadJob>`: `{ id, queue, event, attempts, lastError, createdAt, diedAt }`. |

`ABORTED_GRACE_MS` (1000) es el tiempo que tiene para terminar un job cuya señal se abortó.

### Límites de peticiones

`base.rateLimits` es el `RateLimits` del contexto. El router HTTP también los usa; mira la [API HTTP](/es/reference/http/).

```ts
const creates = base.rateLimits.define('task.create', {
  limit: 30,
  windowMs: 60_000,
})
await creates.take(currentActor().userId)
```

| Export | Miembros |
|---|---|
| `RateLimits` | `define(name, rule)`: el nombre es `<módulo>.<nombre>`, una vez cada uno. `counter`. |
| `RateLimit` | `name`, `rule`, `take(key)` (lanza `TooManyRequests` si se pasa), `forget(key)` |
| `RateLimitRule` | `{ limit: number, windowMs: number }`, ambos enteros desde 1. |
| `RateLimitTake` | `{ allowed, limit, remaining, retryAfterMs }` |

## Descripción

`describeApplication(contexts)` devuelve una `ApplicationDescription`: cada contexto, módulo, caso de uso, evento, tarea programada, dependencia y suscripción. La leen las herramientas.

| Tipo | Forma |
|---|---|
| `ApplicationDescription` | `{ version: 1, contexts: ContextDescription[] }` |
| `ContextDescription` | `{ name, uses, modules, subscriptions }` |
| `ModuleDescription` | `{ id, context, name, className, useCases, events, deps }` |
| `UseCaseDescription` | `{ id, name, retryOnConflict }` |
| `EventDescription` | `{ id, name, schedule: { cron } \| null }` |
| `ModuleDependency` | `{ name, kind: 'module', target }`, `{ name, kind: 'events', target, events }` o `{ name, kind: 'port', target: null }` |
| `SubscriptionDescription` | `{ event, strategy, queue, handler, attempts, filtered }` |

## Adaptadores

Cada adaptador tiene su propio punto de entrada, así una app solo carga lo que usa.

### Bases de datos

| Importa de | Clase | Se abre con |
|---|---|---|
| `@newt-js/core/database/sqlite` | `SqliteDatabase` | `await SqliteDatabase.open({ path, migrations?, waitTimeoutMs? })` |
| `@newt-js/core/database/postgres` | `PostgresDatabase` | `await PostgresDatabase.open({ url, migrations?, connections?, waitTimeoutMs? })` |
| `@newt-js/core/database/mysql` | `MysqlDatabase` | `await MysqlDatabase.open({ url, migrations?, connections?, waitTimeoutMs? })` |
| `@newt-js/core/database/memory` | `MemoryDatabase` | `new MemoryDatabase()` |

| Opción | Por defecto | Significado |
|---|---|---|
| `path` (SQLite) | obligatoria | El fichero. `':memory:'` usa un fichero temporal que se borra en `close()`. |
| `url` (Postgres, MySQL) | obligatoria | La URL de conexión. |
| `migrations` | — | La carpeta con tus migraciones. |
| `connections` | `10` | Tamaño del pool. |
| `waitTimeoutMs` | `30000` | Cuánto espera su turno una transacción o un guard. |

```ts title="src/stores.ts"
return SqliteDatabase.open({
  path:
    Bun.env[`${envOf(context)}_DATABASE`] ?? `data/databases/${context}/${context}.sqlite`,
  migrations,
})
```

`open()` conecta, aplica las migraciones pendientes (primero las de newt, luego las tuyas) y comprueba que la base de datos guarda el texto como debe. `connect()` solo conecta. Las bases de datos SQL tienen además `migrations` (`up()`, `down()`, `status()` → `{ applied, pending, changed }`) y `query(sql, params?)`. Estos puntos de entrada también exportan `Migrations`, `MigrationStatus`, `TransactionConflict` (un `ConcurrencyConflict`, code `transaction_conflict`), y `SqliteDatabaseOptions` o `SqlServerDatabaseOptions`.

El punto de entrada de memoria exporta también `MemoryOutbox`, `MemoryRecords`, `MemoryTransactions` y su tipo `Staged`.

### Ficheros

| Importa de | Clases | Se abre con |
|---|---|---|
| `@newt-js/core/files/local` | `LocalStorage`, `LocalPublicStorage` | `await LocalStorage.open({ folder, baseUrl, secret, clock? })` |
| `@newt-js/core/files/s3` | `S3Storage`, `S3PublicStorage` | `await S3Storage.open({ bucket, accessKeyId, secretAccessKey, sessionToken?, region?, endpoint?, virtualHostedStyle? })` |
| `@newt-js/core/files/memory` | `MemoryStorage`, `MemoryPublicStorage` | `new MemoryStorage()` |

| Opción | Significado |
|---|---|
| `folder` (local) | Dónde se guardan los ficheros. |
| `baseUrl` (local) | La URL en la que se sirve su `handler`. |
| `secret` (local) | Firma las URLs. 32 caracteres o más. |
| `clock` (local) | Para la caducidad de las URLs. Por defecto `systemClock`. |
| `bucket`, `accessKeyId`, `secretAccessKey`, `sessionToken`, `region`, `endpoint`, `virtualHostedStyle` (S3) | El bucket y sus credenciales. `open()` comprueba que se llega al bucket. |
| `publicUrl` (solo `S3PublicStorage`) | La URL base de los ficheros públicos. |

`LocalStorage` sirve sus propias URLs firmadas: dirige los `GET` y `PUT` bajo `baseUrl` a `storage.handler(request)`, como hace `src/stores.ts`. `LocalPublicStorage` sirve además los `GET` sin firmar. Se exportan `LocalStorageOptions`, `S3StorageOptions` y `S3PublicStorageOptions`.

:::danger
Quien tenga el `secret` local puede firmar URLs para leer y escribir cualquier fichero privado. No lo subas al repositorio y usa un valor aleatorio largo.
:::

### Clúster

| Importa de | Clase | Se crea con |
|---|---|---|
| `@newt-js/core/cluster/memory` | `MemoryCluster` | `new MemoryCluster()`, para una sola instancia. |
| `@newt-js/core/cluster/valkey` | `ValkeyCluster` | `new ValkeyCluster(url?, options?)`, con las `RedisOptions` de Bun. Tiene `close()`. |
