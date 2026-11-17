---
title: newt add error
description: Añade un error a un módulo, de un tipo que decide su estado HTTP.
sidebar:
  order: 10
---

`newt add error` añade un error que un módulo puede lanzar, como completar una tarea que ya está hecha. Su tipo decide el estado HTTP que recibe el cliente.

## Uso

```sh
newt add error <context>/<module> <error> --kind <kind> [options]
```

## Argumentos

| Argumento | Significado |
|---|---|
| `context/module` | Un módulo del backend, como `tasks/task` |
| `error` | Lo que ha ido mal, como `already-done` |

## Opciones

| Opción | Por defecto | Significado |
|---|---|---|
| `--kind <kind>` | obligatoria | Con qué responde HTTP |
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

| Tipo | Extiende | Estado HTTP |
|---|---|---|
| `validation` | `ValidationError` | 400 |
| `unauthorized` | `UnauthorizedError` | 401 |
| `forbidden` | `ForbiddenError` | 403 |
| `not-found` | `NotFoundError` | 404 |
| `conflict` | `ConflictError` | 409 |

## Reglas del nombre

- Palabras en minúscula unidas por `-`, cada una empezando por una letra.
- No el nombre de una clase que extienden los errores de newt (`validation-error`, `known-error`…).
- Su código, `<module>.<nombre con _>`, no lo usa otro error del módulo. Un nombre que empieza por el módulo lo quita del código: `task-already-done` y `already-done` dan los dos `task.already_done`.

## Qué escribe

```sh
newt add error tasks/task already-done --kind conflict
```

```text
  created  src/contexts/tasks/modules/task/errors/already-done.ts

Next steps:
  throw it where it happens: throw new AlreadyDone()
```

```ts title="src/contexts/tasks/modules/task/errors/already-done.ts"
import { ConflictError } from '@newt-js/core'

export class AlreadyDone extends ConflictError {
  readonly code = 'task.already_done'

  constructor() {
    super('Already done')
  }
}
```

## Siguientes pasos

- Lánzalo donde ocurre: `throw new AlreadyDone()`.

## Errores

- **Sin `--kind`**: `newt add error needs --kind, which says what HTTP answers it with: validation, unauthorized, forbidden, not-found, conflict`.
- **Un tipo desconocido**: rechazado, con la lista de los cinco.
- **El fichero existe y extiende otro tipo**: rechazado; cámbialo a mano.
- **Un código que ya tiene otro error**: rechazado; ponle nombre por otra cosa que haya ido mal.
- **Un contexto o módulo que no existe**: rechazado, indicando el comando que lo añade.

Consulta [Errores](/es/concepts/errors/).
