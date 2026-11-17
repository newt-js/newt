---
title: Repositorios, filtros y páginas
description: Cómo lee y guarda un módulo sus entidades, filtra filas con criterios y devuelve listas página a página.
sidebar:
  order: 6
---

Un repositorio es la clase que lee las entidades de un módulo de su tabla y las vuelve a guardar. Los casos de uso nunca escriben SQL: piden al repositorio con criterios y le pasan entidades para guardar.

El `Repository` de newt ya sabe leer, guardar, comprobar versiones y publicar eventos. Tu repositorio solo dice qué tabla usa y cómo una fila se convierte en entidad.

## Un repositorio

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

El constructor recibe:

- La base del contexto, por sus transacciones, sus eventos y su ejecutor de casos de uso.
- `base.database.records<TaskRow>('task')`: las filas de la tabla `task`.
- Opciones: `scope` (obligatoria, `'none'` o un scope) y `softDelete` (por defecto `false`). Ver las secciones Scope y Borrado lógico.

Un repositorio no tiene métodos públicos propios. La regla del lint `repository-public-methods` los rechaza: lo que decide un módulo va en sus casos de uso y en su entidad.

## Leer

| Método | Devuelve |
|---|---|
| `find(criteria?, options?)` | Las entidades que coinciden. |
| `count(criteria?, options?)` | Cuántas coinciden. |
| `count(criteria, { by })` | Cuántas coinciden, por cada valor de los campos de `by`. |
| `paginate(criteria, page, options?)` | Una página de entidades que coinciden. |

Opciones de `find`:

- `limit`: como mucho estas.
- `orderBy`: una lista de `{ field, direction? }`, con `direction` `'asc'` (por defecto) o `'desc'`. Sin ella, las filas llegan por id, ascendente. Los ids son UUID v7, que crecen con el tiempo, así que eso es de la más antigua a la más nueva.
- `everyScope`: `true` lee más allá del scope del repositorio.

```ts
const [task] = await this.tasks.find({ id }, { limit: 1 })
const open = await this.tasks.count({ doneAt: null })
const perProject = await this.tasks.count({}, { by: ['projectId'] })
// [{ projectId: '0190…', count: 4 }, …]
```

## Criterios

Los criterios dicen qué filas leer. Son un objeto plano, con los campos de la fila como claves:

```ts
{ name: 'Write the docs' }                       // igual a
{ name: { ieq: 'write the docs' } }              // con un operador
{ createdAt: { gte: '2026-01-01', lt: '2026-02-01' } }  // varios, deben cumplirse todos
{ doneAt: null }                                 // el campo está vacío
{ or: [{ name: 'A' }, { name: 'B' }] }           // cualquiera de
{ and: [{ projectId }, { doneAt: null }] }       // todos
```

Los operadores son los de los [filtros](/es/concepts/schemas-and-dtos/#operadores):

| Operador | Coincide cuando el valor es |
|---|---|
| `eq` | igual |
| `ne` | distinto |
| `in` | uno de una lista |
| `gt` / `gte` | mayor / mayor o igual |
| `lt` / `lte` | menor / menor o igual |
| `ieq` | igual, sin distinguir mayúsculas de la A a la Z |

Un campo con `undefined` se ignora, así que puedes escribir criterios opcionales en línea. Un `{}` vacío coincide con todas las filas.

Los casos de uso rara vez escriben criterios a mano: `TaskFilter.toCriteria(filter)` convierte lo que envió un cliente en criterios.

Dos utilidades:

- `allOf(a, b)` devuelve criterios que cumplen los dos.
- `matches(row, criteria)` comprueba un objeto contra unos criterios, en memoria.

## Páginas

Una lista que puede crecer se lee página a página.

```ts
type PageRequest = { size: number, cursor?: string }
type Page<T> = { items: T[], nextCursor?: string, total?: number }
```

`paginate(criteria, page, options?)` devuelve hasta `page.size` entidades después de `page.cursor`, y:

- `nextCursor`: el id del último elemento, solo si hay más. Envíalo como el siguiente `cursor`.
- `total`: cuántas coinciden con los criterios en total.

Sus opciones son `newestFirst` (`true` lee por id, descendente) y `everyScope`.

Por HTTP, `pageRequestFrom(request)` lee `?size=` y `?cursor=` de la URL (ver [HTTP y rutas](/es/concepts/http/)).

Utilidades para páginas:

| Función | Qué hace |
|---|---|
| `mapPage(page, fn)` | Una página con cada elemento transformado. Los que se transforman en `undefined` se quitan. |
| `toPage(rows, { size, cursor, total? })` | Construye una página con hasta `size + 1` filas: la fila de más dice que hay otra página. |
| `allPages(read, size?)` | Llama a `read` página tras página, de 100 en 100 por defecto, y devuelve todos los elementos. |

```ts
const found = await this.tasks.paginate(criteria, page, { newestFirst: true })
return mapPage(found, each => each.toDTO())
```

:::tip
Un cursor es mejor que "página 3": las filas que se añaden mientras alguien lee no le mueven las páginas.
:::

## Guardar

```ts
await this.tasks.persist(task)
await this.tasks.persist([task, another])
```

`persist(entities, hooks?)` guarda una entidad o una lista, todo en una transacción:

1. Comprueba la [regla de escritura](/es/concepts/use-cases/#la-regla-de-escritura).
2. Escribe cada entidad que tenga algo que guardar. Una nueva se inserta. Una cambiada actualiza solo sus campos cambiados, `updatedAt` y `version`. Una borrada se borra.
3. Publica los eventos que registró cada entidad guardada en la cola de jobs que vive en tu base de datos (el *outbox*), en la misma transacción. Ver [Eventos y suscripciones](/es/concepts/events/).

Las entidades sin nada que guardar se saltan. Si falla alguna escritura, la transacción se deshace y no se guarda nada.

`purge(criteria)` borra de golpe todas las filas que coinciden y devuelve cuántas. No construye entidades, no comprueba versiones ni publica eventos: déjalo para jobs de limpieza.

## Hooks de guardado y guards

`persist` recibe hooks opcionales, que se ejecutan dentro de su transacción:

| Hook | Se ejecuta |
|---|---|
| `before` | Antes de las escrituras. |
| `after` | Después de las escrituras, antes de los eventos. Necesita `guard`. |
| `guard` | Nombra lo que protegen los hooks, como una lista de claves. |

Un hook que lee tiene que nombrar un guard. Supón que un proyecto admite como mucho 100 tareas abiertas:

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

En Postgres y MySQL, el guard bloquea esas claves hasta que acaba la transacción, así que dos guardados del mismo proyecto se turnan. Un guardado espera una clave hasta 30 segundos y después falla con `GuardTimeout`. En SQLite, las escrituras ya se hacen de una en una.

:::caution
Un guardado cuyos hooks leen sin guard lanza `[guard rule] … reads task in a save that guards nothing`, en cualquier base de datos. Sin él, en Postgres otro guardado podría cambiar lo que leyó el hook antes de confirmar. La opción `guardRule` del contexto (`'error'`, `'warn'` u `'off'`) dice qué pasa.
:::

## Transacciones

Cada `persist` es una transacción. Un módulo nunca abre una por su cuenta: la regla del lint `module-transactions` rechaza cualquier uso de las `transactions` de la base en un módulo. Para guardar varias entidades juntas, pásalas a un solo `persist`.

`TransactionSpoiled` se lanza cuando falló un guardado que se unió a una transacción, aunque su error se capturara: se deshace la transacción entera.

## Versiones y conflictos

Cada fila tiene una `version`. Un guardado actualiza o borra una fila solo si su versión sigue siendo la que leyó la entidad, y le suma uno.

| Error | Cuándo | HTTP |
|---|---|---|
| `StaleVersion` | Alguien guardó o borró la fila desde que la leíste. | `409` |
| `DuplicateValue` | Un índice único rechazó un valor. | `409` |
| `TransactionConflict` | Postgres o MySQL rechazó la transacción (un interbloqueo, un fallo de serialización). | `409` |

Los tres son `ConcurrencyConflict`, así que el [caso de uso se ejecuta otra vez](/es/concepts/use-cases/#reintentos-ante-un-conflicto) antes de que el error llegue al cliente. `DuplicateValue` lista los campos en `params.fields` cuando la base de datos dice cuáles.

:::note
De los reintentos, como mucho uno sigue a un `DuplicateValue` por defecto (`conflictRetries.duplicates`). Un valor que guarda otro suele seguir ocupado en la siguiente ejecución.
:::

## Referencias a otras filas

`ReferenceNotFound` (`400`, código `reference_not_found`) dice que un id no apunta a nada: `The project 0190… does not exist`. Lánzalo tú, o usa `resolveRefs`, que busca varios ids y lo lanza para el primero que falte:

```ts
const refs = await resolveRefs({ project: projectId }, { project: projectFinder })
// { project: { id, name } }
```

Cada buscador tiene `find({ id: [id] })`, que devuelve objetos `{ id, name }`. Un id `null` se resuelve como `null`.

## Texto que la base de datos no puede guardar

Un string con el carácter NUL o con un surrogate suelto no se puede guardar como texto. Guardarlo lanza `TextWithNul` (`400`, código `text_with_nul`). `unstorable(text)` y `holdsNul(value)` comprueban un valor antes.

## Scope

Un scope limita un repositorio a las filas de un dueño, como el espacio de trabajo actual:

```ts
super(base, base.database.records<TaskRow>('task'), {
  scope: { field: 'workspaceId', current: () => currentWorkspaceId() },
})
```

- Cada lectura añade `workspaceId = current()` a sus criterios, salvo que pase `everyScope: true`.
- `persist` rechaza una entidad de otro scope, antes de escribir.

Mira [Actor y scope](/es/concepts/actor-and-scope/) para ver de dónde sale el valor actual.

## Borrado lógico

Con `softDelete: true`, una entidad borrada conserva su fila: el guardado pone `deletedAt` (y `updatedAt`) en vez de borrarla, y cada lectura se salta las filas con `deletedAt`. La tabla necesita una columna `deleted_at` que admita nulos.

## Filas y entidades

Un repositorio convierte filas en entidades y al revés con tres métodos protegidos:

| Método | Por defecto |
|---|---|
| `toEntity(row)` | Ninguno: lo escribes tú. |
| `toRow(entity)` | Los campos de la entidad, para un insert. |
| `toChanges(entity)` | Los campos cambiados y `updatedAt`, para un update. |

Sobrescribe `toRow` y `toChanges` cuando la tabla y la entidad no coinciden. `this.records` da la tabla en sí: `find`, `count`, `countBy`, `insert`, `update`, `delete` y `deleteMany`.

## Con el CLI

`newt add module` escribe el repositorio con su módulo, su entidad y su tabla:

```sh
newt add module tasks/task
```

Ver [`newt add module`](/es/reference/cli/add-module/).
