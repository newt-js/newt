---
title: newt add subscription
description: Ejecuta un caso de uso de un módulo cada vez que ocurre uno de sus eventos.
sidebar:
  order: 8
---

`newt add subscription` hace que un caso de uso se ejecute después de un evento, como avisar a la persona asignada cuando se completa una tarea. El caso de uso se ejecuta más tarde como un job: un trabajo pendiente en la cola que vive en tu base de datos (el *outbox*).

## Uso

```sh
newt add subscription <context>/<module> <use-case> --on <event> [options]
```

## Argumentos

| Argumento | Significado |
|---|---|
| `context/module` | Un módulo del backend, como `tasks/task` |
| `use-case` | Un caso de uso de ese módulo, como `notify-assignee` |

## Opciones

| Opción | Por defecto | Significado |
|---|---|---|
| `--on <event>` | obligatoria | El evento del módulo con el que se ejecuta, como `completed` |
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

## Qué escribe

```sh
newt add subscription tasks/task notify-assignee --on completed
```

```text
  created  src/contexts/tasks/modules/task/task.workers.ts
  updated  src/contexts/tasks/modules/task/task.module.ts

Warnings:
  newt cannot tell how to make completed happen, so it wrote no test of notifyAssignee on it: write one in task.module.test.ts

Next steps:
  bun test src/contexts/tasks/modules/task
```

```ts title="src/contexts/tasks/modules/task/task.workers.ts"
import type { Task_Module } from './task.module'

export function registerTaskWorkers(tasks: Task_Module): void {
  tasks.on(tasks.events.completed, 'notifyAssignee', completed => [{ id: completed.id }])
}
```

- `<module>.workers.ts` se crea si no existe, y recibe la línea que suscribe el caso de uso.
- `<module>.module.ts` recibe el evento en `eventsOf` y una llamada a `register<Module>Workers(module)`.
- Si el caso de uso recibe una entrada, le llega `{ id }` desde el evento. Si no recibe ninguna, se llama sin nada.
- Con el evento `created`, newt también escribe un test que crea una entidad y comprueba que el job se ha ejecutado. Con otros eventos, avisa en su lugar.

## Siguientes pasos

- `bun test src/contexts/<context>/modules/<module>`

## Errores

- **Faltan argumentos o `--on`**: `newt add subscription takes the module, its use case and --on the event`.
- **Un caso de uso que el módulo no tiene**: rechazado; añádelo con [`newt add use-case`](/es/reference/cli/add-use-case/).
- **Un evento que el módulo no tiene**: rechazado; solo escucha los eventos del propio módulo. Añádelo con [`newt add event`](/es/reference/cli/add-event/).

Consulta [Eventos y suscripciones](/es/concepts/events/) y [Jobs y workers](/es/concepts/jobs-and-workers/).
