---
title: newt add schedule
description: Runs a use case of a module on a cron, with its schedule, its worker and its test.
sidebar:
  order: 9
---

`newt add schedule` makes a use case run at fixed times, such as every day at 9:00. It writes a scheduled task: the schedule, the use case it runs, and the line that connects them.

## Usage

```sh
newt add schedule <context>/<module> <use-case> --cron "<cron>" [options]
```

## Arguments

| Argument | Meaning |
|---|---|
| `context/module` | A module of the backend, as in `tasks/task` |
| `use-case` | The use case it runs, as in `remind-overdue`: new, or one that takes no input |

## Options

| Option | Default | Meaning |
|---|---|---|
| `--cron <cron>` | required | When it runs: five fields, in UTC |
| `--backend <folder>` | the one you are in | The backend, in a monorepo with several |

It also takes the [global flags](/reference/cli/overview/#global-flags).

## Cron rules

Five fields, separated by spaces. Quote the cron so the shell keeps it in one piece.

:::caution
Crons run in UTC, not in your local time: `0 9 * * *` is 9:00 UTC.
:::

| Field | Values |
|---|---|
| minute | 0–59 |
| hour | 0–23 |
| day of the month | 1–31 |
| month | 1–12 |
| day of the week | 0–7 |

Each field takes `*`, a number, a range (`8-18`), a list (`0,30`) and a step (`*/5`, `0-30/10`). Names such as `MON` or `@daily` are not accepted.

| Cron | Runs |
|---|---|
| `0 9 * * *` | Every day at 9:00 UTC |
| `*/5 * * * *` | Every five minutes |
| `0,30 8-18 * * 1-5` | Every half hour from 8:00 to 18:30, Monday to Friday |

## What it writes

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
    this.remindOverdueSchedule = base.schedules.define('task.remindOverdue', '0 9 * * *')
```

```ts title="src/contexts/tasks/modules/task/task.workers.ts"
  tasks.on(tasks.remindOverdueSchedule, 'remindOverdue')
```

- `<module>.module.ts` gets the `remindOverdueSchedule` field, its definition, an empty `remindOverdue` use case (unless it exists), and the call to `register<Module>Workers(module)`.
- `<module>.workers.ts` is created if missing.
- The test checks that the schedule is defined with its cron and that the use case runs.

## Next steps

- Write what the use case does, in `<module>.module.ts`.
- `bun test src/contexts/<context>/modules/<module>`

## Errors

- **Missing arguments or `--cron`**: `newt add schedule takes the module, the use case it runs and --cron`.
- **A cron that is not one**: `'daily' is not a cron: it has five fields, as in "0 3 * * *", every day at 3:00 UTC`, or which field is out of range.
- **A use case that takes an input**: refused; a schedule gives none.
- **A use case already on another cron**: refused; change the cron in `<module>.module.ts`.
- **A member of the module that is not a use case**: refused.

See [Scheduled tasks](/concepts/schedules/).
