---
title: newt add backend
description: Añade otro backend a un monorepo, en una carpeta propia.
sidebar:
  order: 2
---

`newt add backend` añade un backend a un monorepo creado con `newt init --monorepo`. Cada backend es un paquete aparte, con sus contextos, su puerto y su `.env`.

## Uso

```sh
newt add backend <folder> [options]
```

## Argumentos

| Argumento | Significa |
|---|---|
| `folder` | Dónde va el backend, dentro del monorepo, como `apps/admin` |

La última parte de la carpeta es el nombre de paquete del backend.

## Opciones

| Opción | Por defecto | Significa |
|---|---|---|
| `--port <port>` | el siguiente libre | El puerto en el que sirve, de 1 a 65535 |
| `--db <database>` | `sqlite` | `sqlite`, `postgres`, `mysql` o `memory` |
| `--files <storage>` | `local` | `local`, `s3` o `memory` |
| `--cluster <cluster>` | `memory` | `memory` o `valkey` |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

- Sin `--port`, toma el `PORT` más alto que encuentre en los `.env`, `.env.local` o `.env.example` de los workspaces, y le suma 10. Si no hay ninguno, `3000`.
- Si `--port` es un puerto que ya usa otro workspace, avisa de que una petición podría llegar a cualquiera de los dos.

## Reglas del nombre

La última parte de la carpeta sigue las reglas del nombre de un proyecto: letras minúsculas, dígitos y `- . _ ~`, una letra o un dígito en cada extremo, y no `node_modules`.

## Qué escribe

```sh
newt add backend apps/admin
```

```text
  skipped  package.json (up to date)
  created  apps/admin/package.json
  created  apps/admin/tsconfig.json
  created  apps/admin/eslint.config.ts
  created  apps/admin/AGENTS.md
  created  apps/admin/src/backend.ts
  created  apps/admin/src/stores.ts
  created  apps/admin/src/env.ts
  created  apps/admin/src/backend.test.ts
  created  apps/admin/src/contexts.ts
  created  apps/admin/src/index.ts
  created  apps/admin/src/auth.ts
  created  apps/admin/.env
  created  apps/admin/.env.example
  created  apps/admin/.gitignore
  created  apps/admin/CLAUDE.md

Next steps:
  bun install
  cd apps/admin
  bun run dev
```

- El backend recibe los mismos ficheros que uno de [`newt init`](/es/reference/cli/init/#qué-escribe).
- El `package.json` de la raíz recibe las devDependencies compartidas, y un patrón de `workspaces` para la carpeta si ninguno la cubre.

## Siguientes pasos

1. `bun install`, en la raíz del monorepo
2. `cd <carpeta>`
3. `bun run dev`

## Errores

- **No estás en un monorepo** (no hay un `package.json` con `workspaces` aquí ni en una carpeta superior): usa [`newt init`](/es/reference/cli/init/).
- **Una carpeta fuera del monorepo, o su raíz**: se rechaza.
- **Una carpeta dentro de `node_modules`**: se rechaza.
- **Una carpeta que ya es un paquete, y no un backend de newt**: se rechaza.
- **Una carpeta que contiene otro workspace**: se rechaza; pon el backend a su lado.
- **Un nombre que ya tiene otro workspace**: se rechaza; dos paquetes de un monorepo nunca comparten nombre.
- **Una carpeta excluida por un patrón `!` en `workspaces`**: se rechaza hasta que quites el patrón.

Mira [Monorepos](/es/guides/monorepo/).
