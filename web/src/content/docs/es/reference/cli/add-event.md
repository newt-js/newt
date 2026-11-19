---
title: newt add event
description: Añade un evento a un módulo, en su carpeta events.
sidebar:
  order: 7
---

`newt add event` añade el registro de algo que ha pasado en un módulo, como que se ha completado una tarea. Así otras partes de la app pueden reaccionar a ello.

## Uso

```sh
newt add event <context>/<module> <event> [options]
```

## Argumentos

| Argumento | Significado |
|---|---|
| `context/module` | Un módulo del backend, como `tasks/task` |
| `event` | Lo que ha pasado, como `completed` o `price-changed` |

## Opciones

| Opción | Por defecto | Significado |
|---|---|---|
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

## Reglas del nombre

- Letras minúsculas y dígitos, palabras unidas por `-`, empezando por una letra.
- No repite el módulo: en `tasks/task`, `completed`, no `task-completed`. El fichero se llama `task-completed.ts` igualmente.
- Ni `module`, ni `repository`, ni `deps`: `Task_Module`, `Task_Repository` y `Task_Deps` son del propio módulo.

## Qué escribe

```sh
newt add event tasks/task completed
```

```text
  created  src/contexts/tasks/modules/task/events/task-completed.ts

Next steps:
  emit it from a method of the entity: this.trackEvent(new Task_Completed({ id: this.id }))
  let other modules subscribe to it: add completed: Task_Completed to eventsOf in task.module.ts
```

```ts title="src/contexts/tasks/modules/task/events/task-completed.ts"
import { defineEvent } from '@newt-js/core'
// --------------------------------------------------------
import { TaskSchema }  from '../task.schema'

export const Task_Completed = defineEvent(
  'task.completed',
  TaskSchema.pick({ id: true }),
)
```

Si el módulo no tiene `TaskSchema` en `<module>.schema.ts`, el schema del evento se escribe en el propio fichero.

## Siguientes pasos

- Emítelo desde un método de la entidad: `this.trackEvent(new Task_Completed({ id: this.id }))`.
- Para que otros módulos se suscriban, añade `completed: Task_Completed` a `eventsOf` en `<module>.module.ts`. [`newt add subscription`](/es/reference/cli/add-subscription/) lo hace por ti.

## Errores

- **Faltan argumentos**: `newt add event takes the module and the event, as in newt add event sales/order shipped`.
- **Un nombre que repite el módulo**: `'task-completed' repeats the module: name it completed, and it becomes Task_Completed in events/task-completed.ts`.
- **`module`, `repository` o `deps`**: rechazado; ponle nombre por lo que ha pasado.
- **Un contexto o módulo que no existe**: rechazado, indicando el comando que lo añade.

Consulta [Eventos y suscripciones](/es/concepts/events/).
