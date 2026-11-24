---
title: newt add deps
description: Permite que un módulo use otro módulo de su contexto.
sidebar:
  order: 13
---

`newt add deps` permite que un módulo llame a otro módulo del mismo contexto, como una tarea que lee su proyecto. El otro módulo se le pasa cuando arranca el contexto.

## Uso

```sh
newt add deps <context>/<module> <module-it-uses> [options]
```

## Argumentos

| Argumento | Significado |
|---|---|
| `context/module` | El módulo que usa al otro, como `tasks/task` |
| `module-it-uses` | Otro módulo del mismo contexto, como `project` |

## Opciones

| Opción | Por defecto | Significado |
|---|---|---|
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

## Qué escribe

```sh
newt add deps tasks/task project
```

```text
  created  src/contexts/tasks/modules/task/task.deps.ts
  updated  src/contexts/tasks/modules/task/task.module.ts
  updated  src/contexts/tasks/tasks-modules.ts

Next steps:
  call it in a use case of task: this.deps.project
  bun test src/contexts/tasks/modules/task
```

```ts title="src/contexts/tasks/modules/task/task.deps.ts"
import type { Project_Module } from '../project/project.module'

export type Task_Deps = {
  project: Project_Module
}
```

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

- `<module>.deps.ts` se crea si no existe, y recibe el módulo que usa.
- `<module>.module.ts` recibe `Task_Deps` en `initialize` y en su constructor, y lo guarda como `this.deps`.
- `<context>-modules.ts` le pasa el módulo y ordena los módulos para que cada uno arranque después de los que usa.

## Siguientes pasos

- Llámalo en un caso de uso: `this.deps.project`.
- `bun test src/contexts/<context>/modules/<module>`

## Errores

- **Faltan argumentos**: `newt add deps takes the module and the module of its context it uses`.
- **Un módulo de otro contexto** (`tasks/project`): rechazado; newt todavía no escribe eso.
- **El propio módulo**: rechazado.
- **Un módulo que el contexto no tiene**: rechazado; añádelo con [`newt add module`](/es/reference/cli/add-module/).
- **Un ciclo**: `project → task → project would be a cycle: modules never use each other, even through others. If it is to check who may go on at a path, the context gives its router a guard (router.guard), and no module uses the other`.

Consulta [Servicios y dependencias](/es/concepts/services-and-deps/).
