---
title: Tareas programadas
description: Ejecuta un caso de uso a horas fijas, como cada día a las 9:00, una sola vez entre todas tus instancias.
sidebar:
  order: 10
---

Una tarea programada ejecuta un caso de uso a horas fijas, escritas como expresión cron. Sirve para el trabajo que nadie pide con una petición: recordatorios diarios, limpiezas nocturnas, informes semanales.

## Una tarea programada

La defines en el constructor del módulo con `base.schedules.define(nombre, cron)` y le suscribes un caso de uso:

```ts title="src/contexts/tasks/modules/task/task.module.ts"
readonly remindOverdueSchedule

private constructor(base: ContextBase, private readonly tasks: Task_Repository, private readonly deps: Task_Deps) {
  super('task', base.useCaseRunner, deps)
  this.remindOverdueSchedule = base.schedules.define('task.remindOverdue', '0 9 * * *')
}

@UseCase()
async remindOverdue(): Promise<void> {
}
```

```ts title="src/contexts/tasks/modules/task/task.workers.ts"
export function registerTaskWorkers(tasks: Task_Module): void {
  tasks.on(tasks.remindOverdueSchedule, 'remindOverdue')
}
```

`define` devuelve una fuente de eventos, como uno de los [eventos](/es/concepts/events/) del módulo. Cuando llega la hora, la tarea emite un evento con su nombre, y `on` ejecuta el caso de uso desde un job, como cualquier suscripción.

### Nombres

- Una tarea programada se llama `<módulo>.<nombre>`, en camelCase: `task.remindOverdue`.
- Cada nombre se define una vez por contexto. Definirlo dos veces lanza un error.
- La cola de la suscripción es `task.remindOverdue.on.task.remindOverdue`.

### Qué recibe el caso de uso

El payload del evento es `{ dueAt }`: la hora a la que tocaba la ejecución, como fecha ISO. Un caso de uso sin entrada lo ignora. Para pasárselo, conviértelo:

```ts
tasks.on(tasks.remindOverdueSchedule, 'remindOverdue', tick => [{ until: tick.dueAt }])
```

:::tip
Usa `dueAt`, no la hora actual, para decidir qué procesar. Si la ejecución llega tarde o se reintenta, cubre el mismo periodo.
:::

## Expresiones cron

Una expresión cron tiene cinco campos, separados por espacios:

```text
minuto  hora  día-del-mes  mes   día-de-la-semana
0-59    0-23  1-31         1-12  0-7
```

Cada campo admite:

| Forma | Ejemplo | Significa |
|---|---|---|
| `*` | `*` | todos los valores |
| un número | `9` | ese valor |
| un rango | `1-5` | del 1 al 5 |
| una lista | `0,30` | cada uno de ellos |
| un paso | `*/15`, `10-50/10`, `5/15` | cada 15, desde el inicio |

En el día de la semana, tanto `0` como `7` son domingo. Si se restringen a la vez el día del mes y el de la semana (ninguno empieza por `*`), un día vale si cumple cualquiera de los dos, como en el cron clásico.

Algunos ejemplos:

| Cron | Se ejecuta |
|---|---|
| `0 9 * * *` | cada día a las 09:00 |
| `*/15 * * * *` | cada 15 minutos |
| `0 3 * * 1-5` | de lunes a viernes a las 03:00 |
| `0 0 1 * *` | el día 1 de cada mes a las 00:00 |

No se admiten nombres (`MON`, `JAN`), `@daily`, `?`, `L` ni `#`. Una expresión incorrecta lanza un error al construir el módulo, así que la aplicación no arranca.

### Zona horaria

Todo cron se ejecuta en **UTC**. No hay opción de zona horaria.

:::caution
`0 9 * * *` son las 09:00 UTC, no las 09:00 donde están tus usuarios. Convierte tú la hora, y recuerda que el cambio de horario mueve la hora local pero no la UTC.
:::

## Qué lo ejecuta

Cada contexto arranca sus tareas programadas cuando [`runContexts`](/es/concepts/http/#arrancar-el-servidor) lo arranca, junto a su [worker](/es/concepts/jobs-and-workers/). No hay un proceso aparte que lanzar.

Las tareas miran el reloj al menos una vez por minuto, y antes si la próxima ejecución está más cerca. Una ejecución empieza como mucho un minuto después de su hora.

Cuando toca una ejecución:

1. Newt escribe la hora en la tabla `newt_schedule_tick` de la base de datos del contexto.
2. En la misma transacción, emite el evento de la tarea, que encola un job por suscripción.
3. Un worker ejecuta el caso de uso, con los mismos reintentos que cualquier [job](/es/concepts/jobs-and-workers/).

### Una sola vez entre instancias

Si ejecutas varias instancias, todas miran el reloj. Solo gana una: la fila de `newt_schedule_tick` tiene versión, y solo la primera instancia que la actualiza emite el evento. El caso de uso se ejecuta una vez por hora prevista, tengas las instancias que tengas.

### La primera ejecución y las perdidas

- La primera vez que una instancia ve una tarea nueva, solo apunta la última hora prevista. La primera ejecución real es la siguiente.
- Si la aplicación estaba parada cuando tocaban ejecuciones, al volver se ejecuta **una vez**, por la última de ellas, no una por cada ejecución perdida.

:::note
Como una ejecución pasa por un job, sigue sus reglas: puede reintentarse y se entrega al menos una vez. Escribe el caso de uso para que ejecutarlo dos veces no haga daño.
:::

## En los tests

El contexto de test no hace tic solo. Llama a `schedules.tick()`, adelanta el reloj de test y espera a los jobs:

```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
test('remindOverdue runs at 0 9 * * *', async () => {
  await context.base.schedules.tick()
  context.clock.advance(366 * 24 * 60 * 60 * 1000)
  await context.base.schedules.tick()
  await context.settle()

  const queued = await context.base.database.outbox.list()
  expect(queued.find(each => each.queue === 'task.remindOverdue.on.task.remindOverdue')?.status).toBe('done')
})
```

El primer `tick()` apunta el punto de partida; el segundo, un año después, encuentra una ejecución pendiente. Consulta [Testing](/es/guides/testing/).

## Con el CLI

`newt add schedule` escribe la tarea programada, el caso de uso y su suscripción:

```sh
newt add schedule tasks/task remind-overdue --cron "0 9 * * *"
```

Añade al módulo `remindOverdueSchedule` y un caso de uso `remindOverdue` vacío, la línea en `task.workers.ts` y un test. El caso de uso no puede recibir entrada, porque una tarea programada no da ninguna. Consulta [newt add schedule](/es/reference/cli/add-schedule/).
