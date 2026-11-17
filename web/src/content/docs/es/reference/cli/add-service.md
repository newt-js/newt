---
title: newt add service
description: Añade un servicio a un módulo, una función que comparten sus casos de uso.
sidebar:
  order: 12
---

`newt add service` añade una función normal que comparten varios casos de uso de un módulo, como calcular fechas de vencimiento. Vive en la carpeta `services/` del módulo.

## Uso

```sh
newt add service <context>/<module> <service> [options]
```

## Argumentos

| Argumento | Significado |
|---|---|
| `context/module` | Un módulo del backend, como `tasks/task` |
| `service` | Lo que hace, como `due-dates` |

## Opciones

| Opción | Por defecto | Significado |
|---|---|---|
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

## Reglas del nombre

- Letras minúsculas y dígitos, palabras unidas por `-`, empezando por una letra: `due-dates` se convierte en la función `dueDates`.
- Ni una palabra que JavaScript se reserva, ni un nombre que usa el código que genera newt (`module`, `base`, `router`, `id`, `name`…).

## Qué escribe

```sh
newt add service tasks/task due-dates
```

```text
  created  src/contexts/tasks/modules/task/services/due-dates.ts

Next steps:
  call it from the use cases that share it: import { dueDates } from './services/due-dates'
```

```ts title="src/contexts/tasks/modules/task/services/due-dates.ts"
import type { TaskDTO } from '../task.schema'

export function dueDates(task: TaskDTO): TaskDTO {
  return task
}
```

Si el módulo no tiene `TaskDTO` en `<module>.schema.ts`, la función recibe y devuelve `unknown`.

## Siguientes pasos

- Impórtala en los casos de uso que la comparten: `import { dueDates } from './services/due-dates'`.

## Errores

- **Faltan argumentos**: `newt add service takes the module and the service, as in newt add service sales/order price-rounding`.
- **Un nombre reservado**: rechazado; ponle nombre por lo que hace.
- **Un contexto o módulo que no existe**: rechazado, indicando el comando que lo añade.

Consulta [Servicios y dependencias](/es/concepts/services-and-deps/).
