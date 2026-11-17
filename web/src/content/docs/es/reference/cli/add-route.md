---
title: newt add route
description: Añade a un módulo una ruta HTTP que llama a uno de sus casos de uso.
sidebar:
  order: 6
---

`newt add route` añade una URL que ejecuta un caso de uso, como `POST /tasks/api/tasks/:id/complete-task`. Escribe la ruta y sus tests.

## Uso

```sh
newt add route <context>/<module> <use-case> [options]
```

## Argumentos

| Argumento | Significa |
|---|---|
| `context/module` | Un módulo del backend, como `tasks/task` |
| `use-case` | Un caso de uso de ese módulo, como `complete-task` |

## Opciones

| Opción | Por defecto | Significa |
|---|---|---|
| `--method <method>` | `post` | `get`, `post`, `put`, `patch` o `delete` |
| `--path <path>` | mira la lista | La ruta bajo `/<contexto>/api` |
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

- La ruta por defecto es `/<plural>/:id/<caso-de-uso>`, como `/tasks/:id/complete-task`.
- `--method` no distingue mayúsculas.

## Reglas de la ruta

- Empieza por `/` y solo tiene letras, dígitos y `/ : _ -`.
- No empieza por `/api/` ni por `/<contexto>/`: todas las rutas del contexto ya están bajo `/<contexto>/api`.
- No es `/files` ni algo bajo ella: ahí se sirven los ficheros del contexto.
- Sin segmentos vacíos (ni `//` ni `/` al final), y cada `:param` una sola vez.
- Ninguna otra ruta del backend tiene el mismo método y la misma ruta.

## Qué escribe

```sh
newt add route tasks/task complete-task
```

```text
  updated  src/contexts/tasks/modules/task/task.routes.ts
  updated  src/contexts/tasks/modules/task/task.module.test.ts

Next steps:
  bun test src/contexts/tasks/modules/task
```

```ts title="src/contexts/tasks/modules/task/task.routes.ts"
router.post('/tasks/:id/complete-task', async request =>
  Response.json(
    await tasks.completeTask({ id: TaskId.from(request.params.id) }),
  ),
)
```

Cómo llama la ruta al caso de uso:

| El caso de uso | La ruta |
|---|---|
| Recibe una entrada, la ruta tiene `:id` | Le pasa `{ id }` de la ruta |
| Recibe el id de la entidad tal cual (`get(id: TaskId)`), la ruta tiene `:id` | Le pasa el id de la ruta |
| Recibe una entrada, sin `:id` | Le pasa el cuerpo de la petición |
| No recibe entrada | Lo llama sin nada |
| No devuelve nada | Responde `204` sin cuerpo |

Los tests llaman a la ruta con sesión iniciada, y comprueban que responde 401 a quien no la tiene. Ejecutar el comando otra vez para la misma ruta no cambia nada.

## Avisos

- Una ruta que pasa el cuerpo no recibe test: newt no sabe qué cuerpo enviar. Escribe uno en `<módulo>.module.test.ts`.
- Se avisa de cada `:param` que no llega al caso de uso: léelo en `<módulo>.routes.ts` como `request.params.<param>`.

## Siguientes pasos

- `bun test src/contexts/<contexto>/modules/<módulo>`

## Errores

- **Faltan argumentos**: `newt add route takes the module and the use case it calls`.
- **Un caso de uso que el módulo no tiene**: se rechaza; añádelo con [`newt add use-case`](/es/reference/cli/add-use-case/).
- **Un caso de uso con más de una entrada**: se rechaza; escribe su ruta a mano.
- **Un `get` o `delete` para un caso de uso con entrada, sin `:id`**: se rechaza; añade `:id` o usa `post`, `put` o `patch`.
- **Un método o una ruta no válidos**: se rechaza, diciendo qué regla.
- **Un método y una ruta ya ocupados**: se rechaza, con el fichero que los tiene.

Mira [HTTP y rutas](/es/concepts/http/) y [API HTTP](/es/reference/http/).
