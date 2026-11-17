---
title: Value objects
description: Valores con reglas, como un id o un email, comprobados una vez donde se crean.
sidebar:
  order: 4
---

Un value object es un valor con reglas, como el id de una tarea, un email o una prioridad. Es un string o un número normal con un tipo que dice lo que es, y solo lo crea una función que lo comprueba.

Una función que recibe un `TaskId` no puede recibir por error el id de un proyecto ni un string cualquiera. TypeScript lo rechaza, y el valor ya se comprobó donde se creó.

## Un value object

```ts title="src/contexts/tasks/modules/task/value-objects/priority.ts"
import { defineValueObject } from '@newt-js/core'
import { z } from 'zod'
import { InvalidPriority } from '../errors/invalid-priority'

export const Priority = defineValueObject(
  z.string().trim().min(1).max(100).brand<'Priority'>(),
  text => new InvalidPriority(text),
)
export type Priority = z.output<typeof Priority.schema>
```

```ts
Priority.from(' A-1 ')   // 'A-1', con tipo Priority
Priority.from('  ')      // lanza InvalidPriority
Priority.tryFrom('  ')   // undefined
```

En ejecución, un `Priority` es un string. El `.brand<'Priority'>()` solo existe para TypeScript, así que un `string` normal no es un `Priority` hasta que `from` lo comprueba.

## Usarlo en un schema

Pon su `schema` en el schema del módulo. El campo tiene entonces las reglas y el tipo del value object:

```ts title="src/contexts/tasks/modules/task/task.schema.ts"
export const TaskSchema = z.object({
  id: TaskId.schema,
  name: z.string().trim().min(1).max(100),
  priority: Priority.schema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
```

`TaskDTO['priority']` es ahora un `Priority`. Dentro de un schema, un valor malo falla como cualquier otra comprobación de zod: HTTP responde `400` con el código `validation`. Solo `from` lanza tu propio error.

:::caution
Un campo nuevo en el schema necesita también su columna. Escribe una migración para ella (ver [Base de datos y migraciones](/es/concepts/database/)).
:::

## defineValueObject

```ts
defineValueObject(schema, invalid, extra?)
```

| Argumento | Qué es |
|---|---|
| `schema` | Un schema de zod, normalmente terminado en `.brand<'Nombre'>()`. |
| `invalid` | `(input) => KnownError`: el error que lanza `from` cuando el schema rechaza la entrada. |
| `extra` | Opcional. Un objeto cuyos miembros se añaden al resultado, como `generate()`. |

Devuelve:

| Miembro | Qué hace |
|---|---|
| `schema` | El schema. Úsalo dentro de otros schemas: `id: TaskId.schema`. |
| `from(input)` | Devuelve el valor comprobado, o lanza el error de `invalid`. |
| `tryFrom(input)` | Devuelve el valor comprobado, o `undefined`. |

:::tip
Haz que el error sea un `ValidationError` (`newt add value-object` lo hace). Así un valor malo de un cliente se convierte en un `400` con el código de tu error, no en un `500`.
:::

## Ids: uuidFactory y Uuid

Cada módulo tiene su propio tipo de id:

```ts title="src/contexts/tasks/modules/task/value-objects/task-id.ts"
import { uuidFactory, type Uuid } from '@newt-js/core'

export const TaskId = uuidFactory('TaskId')
export type TaskId = Uuid<'TaskId'>
```

`uuidFactory(name)` crea un value object para strings UUID v7, con un miembro más:

- `TaskId.generate()` devuelve un UUID v7 nuevo, con tipo `TaskId`.
- `TaskId.from(text)` rechaza todo lo que no sea un UUID v7, con `InvalidUuid` (código `invalid_uuid`).

Las rutas convierten el texto de la ruta en un id antes de llamar a un caso de uso:

```ts title="src/contexts/tasks/modules/task/task.routes.ts"
router.get('/tasks/:id', async request =>
  Response.json(
    await tasks.get({ id: TaskId.from(request.params.id) }),
  ),
)
```

`Uuid` es un `uuidFactory('Uuid')` ya hecho, para un id que no es de ningún tipo concreto.

:::note
Un módulo que guarda el id de otro módulo, como el `projectId` de una tarea, declara un value object propio para él, `value-objects/project-id.ts` con `uuidFactory('ProjectId')`. La regla del lint `module-imports` no le deja importar los `value-objects/` del otro módulo, ni su schema como valor. Aun así, su tipo es el mismo que el del id del otro módulo, porque `uuidFactory` lo marca con su nombre: un `ProjectDTO['id']` encaja en él.
:::

## Value objects incluidos

`@newt-js/core` trae estos. Cada uno salvo `EventId` tiene también una factoría (`emailFactory()`, `keyFactory(name, pattern?)`, etc.) que crea uno nuevo con las mismas reglas.

| Value object | Para qué sirve | Error y código |
|---|---|---|
| `Email` | Una dirección de email. | `InvalidEmail`, `invalid_email` |
| `Key` | Un nombre corto hecho por un programa. | `InvalidKey`, `invalid_key` |
| `SearchText` | El texto que un usuario escribe en un buscador. | `InvalidSearchText`, `invalid_search_text` |
| `SecretToken` | Un secreto aleatorio, como un token de sesión. | `InvalidSecretToken`, `invalid_secret_token` |
| `Uuid` | Un id que no es de ningún tipo concreto. | `InvalidUuid`, `invalid_uuid` |
| `EventId` | El id de un evento publicado. | `InvalidUuid`, `invalid_uuid` |

Sus reglas:

- **`Email`** quita los espacios de los extremos, pasa el texto a minúsculas y comprueba que es un email de 254 caracteres como mucho.
- **`Key`** acepta de 1 a 200 letras, dígitos, `.`, `_`, `:` o `-`. `keyFactory('Slug', /^[a-z0-9-]+$/)` crea un tipo de clave con tu propio patrón.
- **`SearchText`** quita los espacios de los extremos y acepta 100 caracteres como mucho. Un texto vacío es válido. Úsalo como `text` de un caso de uso `search(text, page)`.
- **`SecretToken`** son 43 caracteres en base64url. `SecretToken.generate()` crea uno con 32 bytes aleatorios, y `SecretToken.hash(token)` devuelve su SHA-256 en hexadecimal.
- **`EventId`** es un `uuidFactory('EventId')`: el id que recibe cada evento al publicarse.

:::danger
Guarda `SecretToken.hash(token)`, nunca el token. Si no, quien lea tu base de datos podría usar todos los tokens que hay en ella.
:::

## Con el CLI

```sh
newt add value-object tasks/task priority
```

Escribe `value-objects/priority.ts`, su error `errors/invalid-priority.ts` (un `ValidationError` con el código `task.invalid_priority`) y un test. Edita el schema para decir qué es una prioridad. Ver [`newt add value-object`](/es/reference/cli/add-value-object/).
