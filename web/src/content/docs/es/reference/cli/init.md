---
title: newt init
description: Crea un backend, o un monorepo con un primer backend, en una carpeta nueva o en la actual.
sidebar:
  order: 1
---

`newt init` crea un proyecto nuevo: un backend, o un monorepo (varios paquetes en un mismo repositorio) con su primer backend.

## Uso

```sh
newt init [name] [options]
bun create newt [name] [options]
```

## Argumentos

| Argumento | Significa |
|---|---|
| `name` | La carpeta y el nombre de paquete del proyecto. `.` usa la carpeta actual y nombra el paquete como ella. |

Sin nombre, en una terminal interactiva, `newt init` lo pregunta (sugiere `my-app`) y luego pregunta `A backend or a monorepo?`. Sin terminal, o con `--json`, el nombre es obligatorio.

## Opciones

| Opción | Por defecto | Significa |
|---|---|---|
| `--db <database>` | `sqlite` | `sqlite`, `postgres`, `mysql` o `memory` |
| `--files <storage>` | `local` | `local`, `s3` o `memory` |
| `--cluster <cluster>` | `memory` | `memory` o `valkey`: lo que comparten las instancias del backend |
| `--port <port>` | `3000` | El puerto en el que sirve, de 1 a 65535 |
| `--monorepo` | no | Crea un monorepo, con el backend en `apps/api` |
| `--backend <folder>` | `apps/api` | La carpeta del primer backend; solo con `--monorepo` |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

- `--db` y `--files` deciden qué abre cada contexto del backend. Mira [Base de datos y migraciones](/es/concepts/database/) y [Ficheros](/es/concepts/files/).
- `--cluster valkey` es para [ejecutar varias instancias](/es/guides/scaling/). Los tests siguen usando el clúster en memoria.

## Reglas del nombre

- Letras minúsculas, dígitos y `- . _ ~`, con una letra o un dígito en cada extremo. Como mucho 214 caracteres. No `node_modules`.
- Un nombre que las incumple se rechaza con una sugerencia: `My App` sugiere `my-app`.
- `--backend` debe ser una carpeta dentro del monorepo, y su última parte sigue las mismas reglas.

## Qué escribe

```sh
newt init newthub
```

```text
  created  newthub/package.json
  created  newthub/tsconfig.json
  created  newthub/eslint.config.ts
  created  newthub/AGENTS.md
  created  newthub/src/backend.ts
  created  newthub/src/stores.ts
  created  newthub/src/env.ts
  created  newthub/src/backend.test.ts
  created  newthub/src/contexts.ts
  created  newthub/src/index.ts
  created  newthub/src/auth.ts
  created  newthub/.env
  created  newthub/.env.example
  created  newthub/.gitignore
  created  newthub/CLAUDE.md

Next steps:
  cd newthub
  bun install
  bun run dev
```

| Fichero | Cuándo |
|---|---|
| `src/env.ts` | Cuando los stores necesitan variables: `--db postgres`, `--db mysql`, `--files local` o `--files s3` |
| `src/test-database.ts` | Con `--db postgres` o `--db mysql` |
| `.env`, `.env.example` | Siempre: `PORT`, más las variables de `--files` y `--cluster` |

Para qué sirve cada fichero: [Estructura de un proyecto](/es/start/project-structure/). Todas las variables: [Configuración](/es/reference/configuration/).

Con `--monorepo`, escribe además el `package.json`, `AGENTS.md`, `.gitignore` y `CLAUDE.md` de la raíz, y pone el backend en `apps/api` (o en `--backend`).

### En una carpeta con ficheros

`newt init .` o una carpeta que ya existe también funcionan:

- Los ficheros que ya están se conservan (`skipped`). `package.json` y `.env` solo reciben lo que les falta.
- Un `tsconfig.json`, `src/index.ts` o `src/auth.ts` al que le falta lo que newt necesita se conserva, con un aviso que dice qué añadir.
- El `index.ts` que escribe `bun init`, si no ha cambiado, se borra, junto con su clave `"module"` en `package.json`: el backend arranca en `src/index.ts`.
- Si la carpeta ya es un backend, su base de datos, sus ficheros, su clúster y su `PORT` se conservan por encima de las opciones, con un aviso por cada uno que difiera.
- Otro `eslint.config.*` en la carpeta produce un aviso.

## Siguientes pasos

1. `cd <nombre>` (salvo que usaras `.`)
2. `bun install`
3. `bun run dev`

## Errores

- **Un nombre no válido**: `'<name>' cannot name a folder and a package`, con una sugerencia.
- **Más de un nombre**: `newt init takes one name`.
- **`--backend` sin `--monorepo`**: se rechaza; añade `--monorepo`.
- **Dentro de un monorepo**: se rechaza; usa [`newt add backend`](/es/reference/cli/add-backend/).
- **Dentro de otro backend**: se rechaza; crea el proyecto en una carpeta propia.
- **`--monorepo` sobre la carpeta de un backend**: se rechaza; un monorepo va en una carpeta propia.
- **Un `--db`, `--files`, `--cluster` o `--port` no válido**: se rechaza, con la lista de valores aceptados.
