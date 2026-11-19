---
title: newt add value-object
description: Añade un value object a un módulo, con el error que lanza y su test.
sidebar:
  order: 11
---

`newt add value-object` añade un valor con reglas, como la prioridad de una tarea: un texto que se comprueba y se limpia cada vez que llega uno. Escribe el value object, el error que lanza con un valor incorrecto y un test.

## Uso

```sh
newt add value-object <context>/<module> <value-object> [options]
```

## Argumentos

| Argumento | Significado |
|---|---|
| `context/module` | Un módulo del backend, como `tasks/task` |
| `value-object` | El nombre del valor, como `priority` o `postal-code` |

## Opciones

| Opción | Por defecto | Significado |
|---|---|---|
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

## Reglas del nombre

- Letras minúsculas y dígitos, palabras unidas por `-`, empezando por una letra.
- No `<module>-id`: cada módulo ya tiene su id (`TaskId`).

## Qué escribe

```sh
newt add value-object tasks/task priority
```

```text
  created  src/contexts/tasks/modules/task/value-objects/priority.ts
  created  src/contexts/tasks/modules/task/value-objects/priority.test.ts
  created  src/contexts/tasks/modules/task/errors/invalid-priority.ts

Next steps:
  give its rules to the schema it has: z.string().trim().min(1).max(100) in priority.ts
  use it in the module's schema, Priority.schema, and where a value comes in, Priority.from(text)
```

```ts title="src/contexts/tasks/modules/task/value-objects/priority.ts"
import { defineValueObject } from '@newt-js/core'
import { z }                 from 'zod'
// --------------------------------------------------------
import { InvalidPriority }   from '../errors/invalid-priority'

export const Priority = defineValueObject(
  z.string().trim().min(1).max(100).brand<'Priority'>(),
  text => new InvalidPriority(text),
)
export type Priority = z.output<typeof Priority.schema>
```

El error es un `ValidationError` (HTTP 400) con el código `<module>.invalid_<nombre>`.

## Siguientes pasos

- Dale sus reglas, en lugar de `z.string().trim().min(1).max(100)`.
- Usa `Priority.schema` en el schema del módulo, y `Priority.from(text)` donde llega un valor.

## Errores

- **Faltan argumentos**: `newt add value-object takes the module and the value object, as in newt add value-object sales/order sku`.
- **`<module>-id`**: rechazado; el módulo ya tiene su id.
- **Existen algunos de sus tres ficheros, pero no todos**: rechazado; un value object son sus ficheros juntos. Ponle otro nombre o quítalos.
- **Un contexto o módulo que no existe**: rechazado, indicando el comando que lo añade.

Consulta [Value objects](/es/concepts/value-objects/).
