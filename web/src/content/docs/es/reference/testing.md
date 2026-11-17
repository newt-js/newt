---
title: API de testing
description: Lo que exporta @newt-js/core/application/testing para probar un contexto.
sidebar:
  order: 3
---

`@newt-js/core/application/testing` monta un contexto para un test: base de datos real, un reloj que mueves a mano y jobs que se ejecutan cuando lo pides. Para cómo escribir los tests, lee [Testing](/es/guides/testing/).

```ts
import { testContext, TestClock, type TestContext } from '@newt-js/core/application/testing'
```

## testContext

`testContext(options: TestContextOptions): TestContext` crea la base de un contexto sobre su propia plataforma. Su worker y sus tareas programadas no se ejecutan solos: los ejecutas tú con `settle()` y `base.schedules.tick()`.

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
beforeEach(async () => {
  const database = await SqliteDatabase.open({ path: ':memory:', migrations: join(import.meta.dir, '../../migrations') })
  context = testContext({ name: 'tasks', cluster: new MemoryCluster(), database })
  router = new HttpRouter({ database })
  router.authenticateWith(async () => signedIn ? { userId: 'tester' } : null)
  tasks = tasksModules(context.base, router).task
})

afterEach(() => context.close())
```

### Opciones

`TestContextOptions`:

| Opción | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `name` | `string` | — (obligatoria) | El nombre del contexto, igual que en producción (`'tasks'`). Sin `:`. |
| `database` | `Database` | — (obligatoria) | Normalmente SQLite en memoria: `SqliteDatabase.open({ path: ':memory:', migrations })`. |
| `cluster` | `Cluster` | — (obligatoria) | Normalmente `new MemoryCluster()` de `@newt-js/core/cluster/memory`. |
| `at` | `Date \| string` | `'2026-01-01T00:00:00.000Z'` | La hora con la que empieza el reloj. |
| `worker` | `WorkerOptionsGiven` | los del worker | Ajustes del worker (`concurrency`, `leaseMs`, `backoffMs`…). |
| `writeRule` | `WriteRule` | ninguna | Igual que en [ContextBase](/es/reference/core/). |
| `guardRule` | `GuardRule` | ninguna | Igual que en ContextBase. |
| `conflictRetries` | `Partial<ConflictRetries>` | los de ContextBase | Igual que en ContextBase. |
| `storage` | `StorageOptions` | ninguno | Almacenamiento de ficheros, por ejemplo `{ private: new MemoryStorage() }`. |

No puedes pasar `platform` ni `clock`: `testContext` crea los suyos.

:::caution
En un contexto de test los jobs nunca se ejecutan solos. Tras un caso de uso que publica un evento, llama a `await context.settle()` antes de comprobar lo que hicieron sus suscripciones.
:::

### TestContext

| Miembro | Tipo | Qué es |
|---|---|---|
| `base` | `ContextBase` | La base del contexto: pásala a tus módulos (`tasksModules(context.base, router)`). |
| `clock` | `TestClock` | El reloj de `base`. El tiempo no avanza hasta que lo mueves. |
| `logs` | `CapturedLines` | Lo que se ha escrito en el log de este contexto, guardado para el test en vez de imprimirse. |
| `settle()` | `() => Promise<void>` | Ejecuta cada job pendiente, y los jobs que esos dejan, hasta que no queda ninguno. |
| `close()` | `() => Promise<void>` | Para el worker y las tareas programadas, cierra la base de datos y deja de capturar logs. Llámalo en `afterEach`. |

:::tip
Llama a `close()` en `afterEach`, como hacen los tests generados. Si no, la base de datos sigue abierta y los logs siguen capturados para el siguiente test.
:::

Miembros de `base` útiles en un test:

| Miembro | Para qué |
|---|---|
| `base.schedules.tick()` | Lanza cada tarea programada que toca a la hora del reloj. |
| `base.database.outbox.list()` | Los jobs del outbox, con su `queue` y su `status`. |
| `base.bus` | Publica eventos y se suscribe a ellos. |

```ts
await context.base.schedules.tick()
context.clock.advance(366 * 24 * 60 * 60 * 1000)
await context.base.schedules.tick()
await context.settle()

const queued = await context.base.database.outbox.list()
expect(queued.find(each => each.queue === 'task.remindOverdue.on.task.remindOverdue')?.status).toBe('done')
```

### logs

`CapturedLines`:

| Miembro | Tipo | Qué es |
|---|---|---|
| `lines` | `LogLine[]` | Cada línea: `{ at, level, message, fields, context }`. |
| `said(level)` | `(level: 'debug' \| 'info' \| 'warn' \| 'error') => string[]` | Los mensajes de ese nivel. |
| `restore()` | `() => void` | Deja de capturar. `close()` lo llama. |

```ts
expect(context.logs.said('info')).toContain('as a job')
```

## TestClock

Un `Clock` que solo avanza cuando se lo dices.

| Miembro | Firma | Qué hace |
|---|---|---|
| `constructor` | `new TestClock(at?: Date \| string)` | Empieza en `at`, o en `2026-01-01T00:00:00.000Z`. |
| `now` | `() => Date` | La hora actual. |
| `set` | `(at: Date \| string) => void` | Salta a esa hora. |
| `advance` | `(ms: number) => void` | Avanza `ms` milisegundos. |

```ts
const clock = new TestClock('2026-03-01T09:00:00.000Z')
clock.advance(60_000)
clock.now().toISOString() // '2026-03-01T09:01:00.000Z'
```

## Llamar a rutas en un test

No hay una ayuda especial: llama a `router.answer` con un `Request`. Ejecuta la ruta con todas sus comprobaciones (identificación, cuerpo, errores) y sin servidor. Mira [HttpRouter](/es/reference/http/#httprouter).

```ts
const response = await router.answer(new Request('http://backend.test/api/tasks/tasks', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: 'Second' }),
}))
expect(response?.status).toBe(201)
```

Para probar el backend entero, arráncalo en el puerto `0` con almacenamiento en memoria, como hace el `src/backend.test.ts` generado:

```ts title="src/backend.test.ts"
const backend = await startBackend(0, { stores: 'memory' })
const response = await fetch(new URL('/api/health', backend.server!.url))
expect(response.status).toBe(200)
await backend.stop()
```
