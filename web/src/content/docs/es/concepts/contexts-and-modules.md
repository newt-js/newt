---
title: Contextos y módulos
description: Cómo divide newt un backend en partes con su propia base de datos, y cada parte en tipos de cosas.
sidebar:
  order: 1
---

Un contexto es una parte de tu app con su propia base de datos, sus propias rutas y su propia carpeta. Un módulo es un tipo de cosa dentro de un contexto, como una tarea o un proyecto, con todo lo que tu app hace con ella.

newt divide un backend así para que cada parte siga siendo pequeña. Puedes leer, probar y cambiar `chat` sin abrir `tasks`.

## Contextos

Newthub podría tener tres contextos: `tasks`, `chat` y `docs`. Cada uno tiene lo suyo:

| Qué | Dónde, para el contexto `tasks` |
|---|---|
| Su carpeta | `src/contexts/tasks/` |
| Su base de datos | `data/tasks.sqlite` por defecto, o la ruta de `TASKS_DATABASE` |
| Sus migraciones | `src/contexts/tasks/migrations/` |
| Sus rutas | bajo `/api/tasks/` |
| Sus ficheros | su propio almacenamiento (ver [Ficheros](/es/concepts/files/)) |
| Sus jobs y tareas programadas | su propia cola de jobs, que vive en su base de datos (ver [Jobs y workers](/es/concepts/jobs-and-workers/)) |

:::tip
Empieza con un contexto. Añade un segundo cuando una parte de la app tenga sus propios datos y pueda vivir sin el resto, como chat junto a tasks.
:::

Un contexto nunca lee las tablas de otro. En otros sitios a esta idea la llaman *bounded context*, y por eso la clase de newt se llama `BoundedContext`.

## Módulos

Un módulo es un tipo de cosa de un contexto: `task` y `project` en `tasks`. Guarda una [entidad](/es/concepts/entities/) y ofrece sus [casos de uso](/es/concepts/use-cases/).

```txt
src/contexts/tasks/modules/task/
  task.module.ts       los casos de uso
  task.ts              la entidad
  task.schema.ts       los DTO y el filtro
  task.repository.ts   cómo se lee y se guarda una tarea
  task.routes.ts       sus rutas HTTP
  task.workers.ts      lo que hace cuando pasa un evento
  task.deps.ts         los otros módulos que usa
  events/  errors/  value-objects/  services/
```

El lint mantiene esta forma: un módulo tiene solo estos ficheros y carpetas, y una sola entidad. Una segunda entidad es un módulo aparte. Mira [Estructura de un proyecto](/es/start/project-structure/) para ver cada fichero.

## Cómo se conectan

El backend abre cada contexto que aparece en `src/contexts.ts`:

```ts title="src/contexts.ts"
export async function openContexts(platform: Platform, stores: Stores): Promise<ContextToRun[]> {
  const contexts: ContextToRun[] = []
  contexts.push(await Tasks_Context.open(platform, stores))
  return contexts
}
```

Cada contexto abre su base de datos, crea su router y su `ContextBase`, y se los pasa a sus módulos:

```ts title="src/contexts/tasks/tasks.context.ts"
export class Tasks_Context extends BoundedContext {
  private constructor(base: ContextBase, readonly modules: TasksModules) {
    super('tasks', base)
  }

  static async open(platform: Platform, stores: Stores): Promise<ContextToRun> {
    const database = await openDatabase('tasks', join(import.meta.dir, 'migrations'), stores)
    const router = new HttpRouter({ database })
    router.authenticateWith(authenticate)
    const base = new ContextBase({ name: 'tasks', platform, database, storage: await openStorage('tasks', router, stores) })
    return { context: new Tasks_Context(base, tasksModules(base, router)), router }
  }
}
```

`tasks-modules.ts` construye los módulos. Un módulo que usa otro lo recibe aquí, así que el que se usa se construye primero:

```ts title="src/contexts/tasks/tasks-modules.ts"
export function tasksModules(base: ContextBase, router: HttpRouter) {
  const project = Project_Module.initialize(base, router)
  const task = Task_Module.initialize(base, router, { project })
  return {
    task,
    project,
  }
}
```

El `initialize` de cada módulo crea su repositorio y el módulo, y registra sus rutas y sus workers:

```ts title="src/contexts/tasks/modules/task/task.module.ts"
export class Task_Module extends Module {
  static initialize(base: ContextBase, router: HttpRouter, deps: Task_Deps): Task_Module {
    const module = new Task_Module(base, new Task_Repository(base), deps)
    registerTaskRoutes(router, module)
    registerTaskWorkers(module)
    return module
  }

  private constructor(base: ContextBase, private readonly tasks: Task_Repository, private readonly deps: Task_Deps) {
    super('task', base.useCaseRunner, deps)
    // ...
  }
}
```

`initialize` es una convención del código generado, no un método de `Module`.

### ContextBase

`ContextBase` guarda lo que comparten todos los módulos de un contexto. Creas uno por contexto.

| Opción | Por defecto | Qué es |
|---|---|---|
| `name` | obligatoria | El nombre del contexto. No puede llevar `:`. |
| `platform` | obligatoria | Lo que comparten todos los contextos del backend (clúster, observabilidad). |
| `database` | obligatoria | La base de datos del contexto. |
| `clock` | el reloj del sistema | De dónde sale "ahora". Los tests pasan un reloj que pueden mover. |
| `worker` | la configuración por defecto | Cómo ejecuta su worker los jobs. Ver [Jobs y workers](/es/concepts/jobs-and-workers/). |
| `writeRule` | `'error'` | `'off'`, `'warn'` o `'error'`. Ver [la regla de escritura](/es/concepts/use-cases/#la-regla-de-escritura). |
| `guardRule` | `'error'` | `'off'`, `'warn'` o `'error'`. Ver [guards](/es/concepts/repositories/#hooks-de-guardado-y-guards). |
| `conflictRetries` | `{ times: 3, duplicates: 1, backoffMs: 10 }` | Cuántas veces se repite un caso de uso tras un conflicto. Ver [reintentos](/es/concepts/use-cases/#reintentos-ante-un-conflicto). |
| `storage` | ninguno | `{ private?, public? }`: dónde van sus ficheros. |

Lo que un `ContextBase` da a sus módulos:

| Campo | Qué es |
|---|---|
| `name`, `platform`, `clock`, `database` | Lo que le diste. |
| `transactions` | Las transacciones de la base de datos. Los módulos nunca las usan directamente. |
| `useCaseRunner` | Ejecuta cada caso de uso del contexto. |
| `bus` | Publica los [eventos](/es/concepts/events/) del contexto. |
| `worker` | Ejecuta los jobs de la cola del contexto. |
| `schedules` | Las [tareas programadas](/es/concepts/schedules/) del contexto. |
| `rateLimits` | Los límites de peticiones del contexto. |
| `storage` | `storage.private` y `storage.public`. Leer uno que no se configuró lanza un error. |

### BoundedContext

`BoundedContext` es la clase de contexto que extiendes. Tiene un `name` y su `base`, y además:

| Método | Qué hace |
|---|---|
| `start()` | Arranca el worker y las tareas programadas. |
| `stopWorker(deadlineMs?)` | Para las tareas programadas y el worker, y espera hasta `deadlineMs` a los jobs en marcha. |
| `close()` | Cierra la base de datos. |
| `stop()` | `stopWorker()` y después `close()`. |

`runContexts` (en `src/backend.ts`) los llama por ti al arrancar y al parar el backend.

### Module

`Module` es la clase que extiende cada módulo. Su constructor recibe el nombre del módulo, el `useCaseRunner` del contexto y, si quieres, sus dependencias. Te da:

- `name`: el nombre del módulo, `'task'`.
- `useCaseRunner`: el que ejecuta sus casos de uso.
- `on(event, useCase, args?, options?)`: ejecuta un caso de uso cuando pasa un evento. Ver [Eventos y suscripciones](/es/concepts/events/).

## Cómo hablan los módulos entre sí

Dentro de un contexto, un módulo llega a otro de dos formas:

- Llama a los casos de uso del otro, que recibe como dependencia. Ver [Servicios y dependencias](/es/concepts/services-and-deps/).
- Reacciona a los eventos del otro. Ver [Eventos y suscripciones](/es/concepts/events/).

Un módulo importa de otro solo su `*.module.ts`, su `*.schema.ts`, sus `events/` y sus `errors/`. La regla del lint `module-imports` rechaza el resto: la entidad, el repositorio, los value objects, las rutas y los workers del otro son suyos.

## Cómo hablan los contextos entre sí

Un contexto usa otro cuando su `<nombre>.context.ts` lo importa, para abrirse con él. La regla del lint `context-imports` deja que un contexto importe solo los contextos que importa su `.context.ts`, y nunca en ciclo: si `chat` usa `tasks`, `tasks` no puede usar `chat`.

:::note
El CLI todavía no escribe esta conexión. `newt add deps` solo enlaza módulos del mismo contexto.
:::

## Con el CLI

```sh
newt add context tasks
newt add module tasks/task
```

`newt add context` escribe la carpeta del contexto, su `.context.ts`, su `-modules.ts`, su carpeta de migraciones y su línea en `src/contexts.ts`. `newt add module` escribe un módulo con su entidad, sus casos de uso, sus rutas, su tabla y su test. Ver [`newt add context`](/es/reference/cli/add-context/) y [`newt add module`](/es/reference/cli/add-module/).
