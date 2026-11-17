---
title: newt add use-case
description: Añade un caso de uso a un módulo, con su schema y su test.
sidebar:
  order: 5
---

`newt add use-case` añade una cosa que hace un módulo, como completar una tarea. Escribe un método que lee la entidad por su id, la guarda y la devuelve, listo para que lo completes.

## Uso

```sh
newt add use-case <context>/<module> <use-case> [options]
```

## Argumentos

| Argumento | Significa |
|---|---|
| `context/module` | Un módulo del backend, como `tasks/task` |
| `use-case` | El nombre del caso de uso, como `complete-task` |

## Opciones

| Opción | Por defecto | Significa |
|---|---|---|
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

## Reglas del nombre

- Palabras en minúsculas unidas por `-`, cada una empezando por una letra: `complete-task` se convierte en el método `completeTask`.
- No `find`, `get`, `paginate` ni `search`: el lint de newt da forma a esas lecturas.
- No `name`, `useCaseRunner`, `on`, `deps` ni `events`, que tiene todo módulo, ni una palabra que JavaScript se reserva.
- No un nombre que el módulo ya tenga como miembro, o cuyo schema (`TaskCompleteTaskSchema`, `TaskCompleteTaskDTO`) ya esté en `<módulo>.schema.ts`.

## Qué escribe

```sh
newt add use-case tasks/task complete-task
```

```text
  updated  src/contexts/tasks/modules/task/task.schema.ts
  updated  src/contexts/tasks/modules/task/task.module.ts
  updated  src/contexts/tasks/modules/task/task.module.test.ts

Next steps:
  change the task by a method of its entity, in task.ts, and call it before persist in completeTask
  bun test src/contexts/tasks/modules/task
```

El schema y el método que añade:

```ts title="src/contexts/tasks/modules/task/task.schema.ts"
export const TaskCompleteTaskSchema = TaskSchema.pick({ id: true })
export type TaskCompleteTaskDTO = z.input<typeof TaskCompleteTaskSchema>
```

```ts title="src/contexts/tasks/modules/task/task.module.ts"
  @UseCase()
  async completeTask(input: TaskCompleteTaskDTO): Promise<TaskDTO> {
    const { id } = TaskCompleteTaskSchema.parse(input)
    const [task] = await this.tasks.find(TaskFilter.toCriteria<TaskRow>({ id }), { limit: 1 })
    if (!task) {
      throw new TaskNotFound()
    }
    await this.tasks.persist(task)
    return task.toDTO()
  }
```

El test comprueba que el caso de uso lee la tarea por su id y la devuelve. Ejecutar el comando otra vez para el mismo caso de uso no cambia nada.

## Siguientes pasos

- Cambia la entidad con un método propio, en `<módulo>.ts`, y llámalo antes de `persist`.
- `bun test src/contexts/<contexto>/modules/<módulo>`

## Errores

- **Faltan argumentos**: `newt add use-case takes the module and the use case, as in newt add use-case sales/order mark-paid`.
- **Un contexto o módulo que no existe**: se rechaza, con el comando que lo añade.
- **El nombre de una lectura** (`find`, `get`, `paginate`, `search`): se rechaza; nombra el caso de uso por lo que hace.
- **Un nombre que el módulo ya usa**: se rechaza.

Mira [Casos de uso](/es/concepts/use-cases/).
