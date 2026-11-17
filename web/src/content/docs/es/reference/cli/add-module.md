---
title: newt add module
description: Añade un módulo a un contexto, con su entidad, casos de uso, rutas, tabla y test.
sidebar:
  order: 4
---

`newt add module` añade un tipo de cosa a un contexto, como `task` en `tasks`. Escribe un módulo que ya funciona: una entidad, su schema, un repositorio, casos de uso para crear, leer y listar, rutas, una tabla y un test.

## Uso

```sh
newt add module <context>/<module> [options]
```

## Argumentos

| Argumento | Significa |
|---|---|
| `context` | Un contexto del backend, como `tasks` |
| `module` | El nombre del módulo, en singular, como `task` o `price-change` |

## Opciones

| Opción | Por defecto | Significa |
|---|---|---|
| `--plural <name>` | reglas del inglés | Su plural, cuando las reglas fallan: `--plural people` |
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

- El plural nombra las rutas (`/tasks/tasks`) y la variable del módulo (`tasks`).
- Las reglas añaden `s`; `es` tras `s x z ch sh`; `ies` para consonante más `y`; y `es` en las palabras en `-sis`. Conocen `child`, `person`, `man`, `woman`, `mouse`, `goose`, `foot`, `tooth`, `quiz`, `news`, `series` y `species`.

## Reglas del nombre

- Letras minúsculas y dígitos, palabras unidas por `-`, empezando por una letra: `task`, `price-change`. El plural sigue la misma forma.
- No una palabra que JavaScript se reserva (`class`, `delete`, `new`…).
- No un nombre que el código generado de newt usa para otra cosa (`module`, `base`, `router`, `events`, `id`, `name`, `entity`, `page`…).
- Su plural no puede ser `files`: `/<contexto>/files` sirve los ficheros del contexto.
- No puede empezar por `newt-`: las tablas que empiezan por `newt_` son de newt.
- El nombre de la tabla (`price_change`) cabe en 63 caracteres.

De `price-change`, newt saca `PriceChange`, `priceChange`, la tabla `price_change` y el plural `priceChanges` / `price-changes`.

## Qué escribe

```sh
newt add module tasks/task
```

```text
  created  src/contexts/tasks/modules/task/value-objects/task-id.ts
  created  src/contexts/tasks/modules/task/task.schema.ts
  created  src/contexts/tasks/modules/task/events/task-created.ts
  created  src/contexts/tasks/modules/task/errors/task-not-found.ts
  created  src/contexts/tasks/modules/task/task.ts
  created  src/contexts/tasks/modules/task/task.repository.ts
  created  src/contexts/tasks/modules/task/task.module.ts
  created  src/contexts/tasks/modules/task/task.routes.ts
  created  src/contexts/tasks/modules/task/task.module.test.ts
  created  src/contexts/tasks/migrations/00001_task_up.sql
  created  src/contexts/tasks/migrations/00001_task_down.sql
  updated  src/contexts/tasks/tasks-modules.ts

Next steps:
  bun test src/contexts/tasks/modules/task
  its routes ask for a session: write authenticate in src/auth.ts to call them from outside the tests
```

- Las migraciones reciben el siguiente número de la carpeta `migrations/` del contexto, y se escriben en el SQL del backend (SQLite, Postgres o MySQL).
- `<contexto>-modules.ts` recibe la línea que arranca el módulo.
- Las rutas son `POST /<contexto>/<plural>`, `GET /<contexto>/<plural>` y `GET /<contexto>/<plural>/:id`, bajo `/api`.

:::note
Las rutas generadas piden a alguien con sesión iniciada. Hasta que `authenticate` en `src/auth.ts` diga quién llama, responden 401 fuera de los tests. Mira [Autenticación](/es/guides/authentication/).
:::

## Siguientes pasos

- `bun test src/contexts/<contexto>/modules/<módulo>`
- Escribe `authenticate` en `src/auth.ts` para llamar a las rutas desde fuera de los tests.

## Errores

- **No es `<contexto>/<módulo>`**: `newt add module takes the context and the module, as in newt add module sales/order`.
- **Un contexto que el backend no tiene**: se rechaza; añádelo con [`newt add context`](/es/reference/cli/add-context/).
- **Un nombre que incumple las reglas**: `'<name>' cannot name a module: …`, diciendo qué regla.
- **Un `--plural` no válido**: `'<plural>' cannot be the plural of <module>`.
- **`src/stores.ts` no abre ninguna base de datos que newt conozca**: se rechaza, porque newt no sabe en qué SQL escribir.

Mira [Contextos y módulos](/es/concepts/contexts-and-modules/) y [Entidades](/es/concepts/entities/).
