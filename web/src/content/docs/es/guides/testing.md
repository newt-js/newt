---
title: Testing
description: Ejecuta los tests que genera newt y escribe los tuyos para casos de uso, rutas, jobs y tareas programadas.
sidebar:
  order: 2
---

Los tests de newt son ficheros normales de `bun test` que ejecutan tus módulos reales sobre una base de datos en memoria. Sirven para comprobar un caso de uso, sus rutas, sus jobs y sus tareas programadas en milisegundos, sin servidor ni base de datos en marcha.

## Qué genera newt

| Fichero | Qué prueba |
|---|---|
| `src/backend.test.ts` | El backend entero arranca y responde a su ruta de salud |
| `<module>.module.test.ts` | Un módulo: sus casos de uso y sus rutas |
| `<value-object>.test.ts` | Las reglas de un value object |
| `src/test-database.ts` | No es un test: la base de datos que abren los tests de módulo, solo en Postgres o MySQL |

`newt add module`, `newt add use-case`, `newt add route`, `newt add schedule` y `newt add subscription` añaden tests al fichero de tests del módulo. Son un punto de partida: edítalos según crezcan tus casos de uso.

## Ejecutar los tests

1. Ejecuta todos los tests:

   ```sh
   bun run test
   ```

   `bun run test` ejecuta `bun test`. Funcionan los dos.

2. Ejecuta los tests de una carpeta o un fichero:

   ```sh
   bun test src/contexts/tasks
   ```

3. Ejecuta solo los tests cuyo nombre coincida:

   ```sh
   bun test -t "creates a task"
   ```

:::tip
Ejecuta `bun run test`, `bun run typecheck` y `bun run lint` después de cada cambio. Un proyecto generado espera que pasen los tres.
:::

## Probar un módulo

Un test de módulo construye el contexto a mano, con una base de datos en memoria, y llama a los casos de uso del módulo como funciones. Este es el test que escribe `newt add module tasks/task` en SQLite:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
import type { TestContext } from '@newt-js/core/application/testing'
import { testContext }      from '@newt-js/core/application/testing'
import { MemoryCluster }    from '@newt-js/core/cluster/memory'
import { SqliteDatabase }   from '@newt-js/core/database/sqlite'
import { HttpRouter }       from '@newt-js/core/http'
import { afterEach }        from 'bun:test'
import { beforeEach }       from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { join }             from 'node:path'
// --------------------------------------------------------
import { tasksModules }     from '../../tasks-modules'
import type { Task_Module } from './task.module'

let context: TestContext
let router: HttpRouter
let tasks: Task_Module
let signedIn: boolean

beforeEach(async () => {
  const database = await SqliteDatabase.open({
    path: ':memory:',
    migrations: join(import.meta.dir, '../../migrations'),
  })
  context = testContext({
    name: 'tasks',
    cluster: new MemoryCluster(),
    database,
  })
  router = new HttpRouter({ prefix: '/tasks/api', database })
  signedIn = true
  router.authenticateWith(async () =>
    signedIn ? { userId: 'tester' } : null,
  )
  tasks = tasksModules(context.base, router).task
})

afterEach(() => context.close())

test('creates a task and reads it back', async () => {
  const created = await tasks.create({ name: ' First ' })

  expect(await tasks.get(created.id)).toMatchObject({
    id: created.id,
    name: 'First',
  })
})
```

Esto es lo que construye `beforeEach` para cada test:

```mermaid
flowchart TD
  migrations[migrations/] --> db[(SQLite en memoria)]
  db --> ctx[testContext]
  db --> router[HttpRouter]
  signedIn[autenticador del test] --> router
  ctx -->|context.base| modules[tasksModules]
  router --> modules
  modules --> tasks[módulo task]
  test[Tu test] -->|llama a un caso de uso| tasks
  test -->|router.answer| router
```

Paso a paso:

1. `SqliteDatabase.open({ path: ':memory:', migrations })` abre una base de datos SQLite nueva y vacía para cada test y ejecuta en ella las migraciones del contexto. Así también se prueba tu SQL.
2. `testContext(...)` construye el contexto alrededor de esa base de datos, con un [reloj de test](#mover-el-reloj) y un worker que solo ejecuta jobs cuando se lo pides.
3. `new HttpRouter({ prefix: '/tasks/api', database })` y `tasksModules(context.base, router)` construyen los módulos del contexto y registran sus rutas, igual que el backend real.
4. `context.close()` cierra la base de datos después de cada test.

:::note
`:memory:` es una base de datos SQLite de verdad: newt la guarda en un fichero temporal y lo borra en `close()`. Se comporta igual que el fichero que usa tu backend.
:::

### Opciones de testContext

`testContext` recibe las mismas opciones que la configuración del propio contexto, salvo la plataforma y el reloj:

| Opción | Obligatoria | Qué es |
|---|---|---|
| `name` | sí | El nombre del contexto, `'tasks'` |
| `database` | sí | La base de datos que usa el contexto |
| `cluster` | sí | Lo que comparten las instancias; `new MemoryCluster()` en tests |
| `at` | no | El inicio del reloj, un `Date` o un texto ISO |
| `storage` | no | El almacenamiento de ficheros del contexto |
| `worker` | no | Opciones del worker, como `backoffMs` |
| `writeRule` | no | `'error'` (por defecto), `'warn'` u `'off'` |
| `guardRule` | no | `'error'` (por defecto), `'warn'` u `'off'` |
| `conflictRetries` | no | `{ times, duplicates, backoffMs }` |

- `writeRule`: qué pasa cuando un caso de uso escribe en otro módulo fuera de un worker.
- `guardRule`: qué pasa cuando un guardado lee tablas sin nombrarlas en su guard.
- `conflictRetries`: cuántas veces reintenta un caso de uso cuando otro guardado cambió antes la misma fila.
- El reloj de test empieza en `2026-01-01T00:00:00.000Z` salvo que pases `at`.

### Qué te da un TestContext

| Miembro | Qué hace |
|---|---|
| `base` | La base del contexto: base de datos, tareas programadas, worker, almacenamiento |
| `clock` | El [reloj de test](#mover-el-reloj) |
| `logs` | Las líneas de log escritas durante el test |
| `email` | Lo que envía sus emails: `email.sent` los tiene todos, y no sale ninguno |
| `settle()` | Ejecuta todos los jobs pendientes y espera a que acaben |
| `close()` | Para tareas programadas y worker, y cierra la base de datos |

`logs.lines` guarda todas las líneas; `logs.said('warn')` devuelve los mensajes de un nivel (`debug`, `info`, `warn`, `error`).

## Probar una ruta

`router.answer(request)` pasa una petición por el router sin servidor. Devuelve la respuesta, o `null` si ninguna ruta atiende esa ruta de URL.

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test('creates one by its route and reads it by another', async () => {
  const posted = await router.answer(
    new Request('http://backend.test/tasks/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Second' }),
    }),
  )
  expect(posted?.status).toBe(201)
  const { id } = (await posted!.json()) as { id: string }

  const read = await router.answer(
    new Request(`http://backend.test/tasks/api/tasks/${id}`),
  )
  expect(await read?.json()).toMatchObject({ id, name: 'Second' })
})
```

El host (`backend.test`) puede ser cualquiera; solo cuenta la ruta.

Para comprobar que una ruta llama al caso de uso correcto, espíalo:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
import { spyOn } from 'bun:test'

test('POST /tasks/:id/complete-task calls completeTask', async () => {
  const created = await tasks.create({ name: 'First' })
  const called = spyOn(tasks, 'completeTask')

  const response = await router.answer(
    new Request(
      `http://backend.test/tasks/api/tasks/${created.id}/complete-task`,
      { method: 'POST' },
    ),
  )
  expect(response?.status).toBe(200)
  expect(called).toHaveBeenCalledWith({ id: created.id })
})
```

## Iniciar y cerrar sesión

El router del test identifica a todo el mundo como `tester` mientras `signedIn` vale `true`. Sustituye, durante el test, al `src/auth.ts` del backend (consulta [Autenticación](/es/guides/authentication/)):

```ts
router.authenticateWith(async () => signedIn ? { userId: 'tester' } : null)
```

Para probar una petición de alguien sin sesión, pon `signedIn = false` antes de la petición. Entonces toda ruta privada responde 401:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test(
  'GET /tasks/api/tasks answers 401 to who has not signed in',
  async () => {
    signedIn = false
    const response = await router.answer(
      new Request('http://backend.test/tasks/api/tasks'),
    )
    expect(response?.status).toBe(401)
  },
)
```

Para probar con dos personas distintas, devuelve otro `userId`, por ejemplo a partir de una cabecera que pongas en el test.

Cuando llamas a un caso de uso directamente, no hay nadie con sesión. Si el caso de uso necesita saber quién es el [actor](/es/concepts/actor-and-scope/), ejecútalo en nombre de alguien con `runAsActor`:

```ts
import { runAsActor } from '@newt-js/core'

const created = await runAsActor({ userId: 'ana' }, () =>
  tasks.create({ name: 'First' }),
)
```

:::caution
Un caso de uso que necesita un actor y se ejecuta sin él lanza `NoActor` (401, código `not_signed_in`). Si una llamada directa falla así, envuélvela en `runAsActor`.
:::

## Mover el reloj

`context.clock` es un `TestClock`: está parado hasta que lo mueves. Lo leen los casos de uso, las entidades, el worker y las tareas programadas.

| Método | Qué hace |
|---|---|
| `now()` | La hora actual, un `Date` |
| `set(at)` | Salta a `at`, un `Date` o un texto ISO |
| `advance(ms)` | Avanza `ms` milisegundos |

```ts
context.clock.set('2026-03-01T08:59:00.000Z')
context.clock.advance(60_000)
```

## Ejecutar jobs con settle()

Cuando un caso de uso registra un [evento](/es/concepts/events/), cada suscripción se convierte en un job en el outbox: la cola de jobs que vive en tu base de datos. En un test, el worker no se pone en marcha solo. `await context.settle()` ejecuta todos los jobs que tocan, y luego los que esos jobs creen, hasta que no queda ninguno.

Cuando `completeTask` registre el evento `completed`, esto comprueba que `notifyAssignee` se ejecutó:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test('notifies the assignee once a task is completed', async () => {
  const created = await tasks.create({ name: 'First' })
  await tasks.completeTask({ id: created.id })

  await context.settle()

  const jobs = await context.base.database.outbox.list()
  expect(
    jobs.find(
      job => job.queue === 'task.notifyAssignee.on.task.completed',
    )?.status,
  ).toBe('done')
})
```

## Revisar los jobs del outbox

`context.base.database.outbox.list(query?)` devuelve los jobs. Cada job tiene una `queue` con el nombre `<module>.<use case>.on.<event>`, un `status` (`pending`, `running`, `done` o `dead`), sus `attempts` y su `lastError`.

La consulta es opcional:

| Campo | Qué hace |
|---|---|
| `status` | Solo los jobs con ese estado |
| `limit` | Como mucho ese número de jobs |
| `after` | Los jobs posteriores a ese id |

Un job que falla espera antes del siguiente intento: 10 segundos la primera vez, el doble cada vez, hasta 15 minutos. La espera sigue al reloj de test. Para probar un reintento, avanza el reloj y vuelve a llamar a `settle()`:

```ts
await context.settle()
context.clock.advance(10_000)
await context.settle()
```

Tras su último intento (5 por defecto) el estado del job es `dead`. Para que los reintentos toquen al momento, pasa `worker: { backoffMs: 0 }` a `testContext`.

## Probar una tarea programada

Una [tarea programada](/es/concepts/schedules/) tampoco se ejecuta sola en un test. `context.base.schedules.tick()` compara cada tarea programada con el reloj, una vez.

El primer `tick()` solo apunta en qué punto está cada tarea y no ejecuta nada. Mueve el reloj más allá de la siguiente hora, vuelve a llamar a `tick()` y a `settle()` para que se ejecute el job:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test('remindOverdue runs at 0 9 * * *', async () => {
  await context.base.schedules.tick()
  context.clock.advance(366 * 24 * 60 * 60 * 1000)
  await context.base.schedules.tick()
  await context.settle()

  const queued = await context.base.database.outbox.list()
  expect(
    queued.find(
      each => each.queue === 'task.remindOverdue.on.task.remindOverdue',
    )?.status,
  ).toBe('done')
})
```

:::tip
Para probar la hora exacta, arranca el reloj justo antes con `testContext({ ..., at: '2026-03-01T08:59:00.000Z' })`, llama a `tick()`, avanza un minuto y vuelve a llamar a `tick()`.
:::

## Probar el backend entero

`src/backend.test.ts` arranca el backend real en un puerto libre, con todos los almacenes en memoria:

```ts title="src/backend.test.ts"
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { startBackend } from './backend'

test('the backend answers its health', async () => {
  const backend = await startBackend(0, { stores: 'memory' })
  const response = await fetch(new URL('/health-check', backend.server!.url))
  expect(response.status).toBe(200)
  await backend.stop()
})
```

- El puerto `0` deja que el sistema elija uno libre.
- `stores: 'memory'` abre en memoria la base de datos y los ficheros de cada contexto, y también el clúster. En SQLite, las bases de datos son SQLite en memoria con sus migraciones; en Postgres y MySQL, la base de datos en memoria de newt.
- No lee ningún valor de `.env` que exija `src/stores.ts`, así que funciona en cualquier sitio.
- Termina siempre con `await backend.stop()`.

Úsalo para tests que pasan por el servidor HTTP real, como comprobar cabeceras o un frontend.

## Tests de módulo en Postgres o MySQL

En un backend con Postgres o MySQL, los tests de módulo abren su base de datos con `src/test-database.ts`:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
beforeEach(async () => {
  const { database, drop } = await testDatabase(
    join(import.meta.dir, '../../migrations'),
  )
  dropDatabase = drop
  context = testContext({
    name: 'tasks',
    cluster: new MemoryCluster(),
    database,
  })
  // ...
})

afterEach(async () => {
  await context.close()
  await dropDatabase()
})
```

- Sin `TEST_DATABASE_URL`, `testDatabase` devuelve una base de datos en memoria. Los tests son rápidos, pero tus migraciones SQL no se ejecutan.
- Con `TEST_DATABASE_URL`, cada test crea una base de datos nueva en ese servidor (llamada `test_<aleatorio>`), ejecuta en ella las migraciones del contexto y la borra al final.

Para probar tus migraciones en un servidor real:

1. Arranca un servidor Postgres o MySQL donde puedas crear y borrar bases de datos.
2. Ejecuta los tests con su URL:

   ```sh
   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
     bun test
   ```

   Para MySQL: `TEST_DATABASE_URL=mysql://root:root@localhost:3306/mysql bun test`.

El nombre de la base de datos de la URL se sustituye por el de cada test; el usuario debe poder crear bases de datos.

:::caution
Sin `TEST_DATABASE_URL`, un error en una migración de Postgres o MySQL pasa los tests y falla al arrancar el backend. Ejecuta los tests con ella antes de desplegar, por ejemplo en CI.
:::

:::danger
Nunca apuntes `TEST_DATABASE_URL` a tu servidor de producción. Los tests crean y borran bases de datos en él.
:::
