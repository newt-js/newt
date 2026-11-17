---
title: newt add schedule
description: Ejecuta un caso de uso de un módulo según un cron, con su tarea programada, su worker y su test.
sidebar:
  order: 9
---

`newt add schedule` hace que un caso de uso se ejecute a horas fijas, como todos los días a las 9:00. Escribe una tarea programada: la definición, el caso de uso que ejecuta y la línea que los une.

## Uso

```sh
newt add schedule <context>/<module> <use-case> --cron "<cron>" [options]
```

## Argumentos

| Argumento | Significado |
|---|---|
| `context/module` | Un módulo del backend, como `tasks/task` |
| `use-case` | El caso de uso que ejecuta, como `remind-overdue`: nuevo, o uno que no recibe entrada |

## Opciones

| Opción | Por defecto | Significado |
|---|---|---|
| `--cron <cron>` | obligatoria | Cuándo se ejecuta: cinco campos, en UTC |
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

## Reglas del cron

Cinco campos separados por espacios. Pon el cron entre comillas para que la shell lo mantenga junto.

:::caution
Los crons van en UTC, no en tu hora local: `0 9 * * *` son las 9:00 UTC.
:::

| Campo | Valores |
|---|---|
| minuto | 0–59 |
| hora | 0–23 |
| día del mes | 1–31 |
| mes | 1–12 |
| día de la semana | 0–7 |

Cada campo acepta `*`, un número, un rango (`8-18`), una lista (`0,30`) y un paso (`*/5`, `0-30/10`). No acepta nombres como `MON` ni `@daily`.

| Cron | Se ejecuta |
|---|---|
| `0 9 * * *` | Todos los días a las 9:00 UTC |
| `*/5 * * * *` | Cada cinco minutos |
| `0,30 8-18 * * 1-5` | Cada media hora de 8:00 a 18:30, de lunes a viernes |

## Qué escribe

```sh
newt add schedule tasks/task remind-overdue --cron "0 9 * * *"
```

```text
  updated  src/contexts/tasks/modules/task/task.module.ts
  updated  src/contexts/tasks/modules/task/task.workers.ts
  updated  src/contexts/tasks/modules/task/task.module.test.ts

Next steps:
  write what remindOverdue does, in task.module.ts
  bun test src/contexts/tasks/modules/task
```

```ts title="src/contexts/tasks/modules/task/task.module.ts"
this.remindOverdueSchedule = base.schedules.define(
  'task.remindOverdue',
  '0 9 * * *',
)
```

```ts title="src/contexts/tasks/modules/task/task.workers.ts"
  tasks.on(tasks.remindOverdueSchedule, 'remindOverdue')
```

- `<module>.module.ts` recibe el campo `remindOverdueSchedule`, su definición, un caso de uso `remindOverdue` vacío (si no existe) y la llamada a `register<Module>Workers(module)`.
- `<module>.workers.ts` se crea si no existe.
- El test comprueba que la tarea programada se define con su cron y que el caso de uso se ejecuta.

## Siguientes pasos

- Escribe lo que hace el caso de uso, en `<module>.module.ts`.
- `bun test src/contexts/<context>/modules/<module>`

## Errores

- **Faltan argumentos o `--cron`**: `newt add schedule takes the module, the use case it runs and --cron`.
- **Algo que no es un cron**: `'daily' is not a cron: it has five fields, as in "0 3 * * *", every day at 3:00 UTC`, o qué campo está fuera de rango.
- **Un caso de uso que recibe una entrada**: rechazado; una tarea programada no le da ninguna.
- **Un caso de uso que ya tiene otro cron**: rechazado; cambia el cron en `<module>.module.ts`.
- **Un miembro del módulo que no es un caso de uso**: rechazado.

Consulta [Tareas programadas](/es/concepts/schedules/).
