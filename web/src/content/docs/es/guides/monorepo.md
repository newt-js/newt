---
title: Monorepos
description: Ten varios backends de newt en un repositorio, cada uno en su carpeta.
sidebar:
  order: 6
---

Un monorepo es un repositorio que contiene varios paquetes. Con newt, cada backend es un paquete propio (un *workspace* de Bun), y la raíz ejecuta los scripts de todos.

Úsalo cuando tengas más de un backend, como la API de Newthub y un backend de administración. Un backend con varios contextos no lo necesita.

## Crea uno

```sh
newt init newthub --monorepo
```

```txt
  created  newthub/package.json
  created  newthub/AGENTS.md
  created  newthub/.gitignore
  created  newthub/CLAUDE.md
  created  newthub/apps/api/package.json
  created  newthub/apps/api/tsconfig.json
  created  newthub/apps/api/eslint.config.ts
  created  newthub/apps/api/AGENTS.md
  created  newthub/apps/api/src/backend.ts
  created  newthub/apps/api/src/stores.ts
  created  newthub/apps/api/src/env.ts
  created  newthub/apps/api/src/backend.test.ts
  created  newthub/apps/api/src/contexts.ts
  created  newthub/apps/api/src/index.ts
  created  newthub/apps/api/src/auth.ts
  created  newthub/apps/api/.env
  created  newthub/apps/api/.env.example
  created  newthub/apps/api/.gitignore
  created  newthub/apps/api/CLAUDE.md

Next steps:
  cd newthub
  bun install
  bun run dev
```

`bun create newt newthub --monorepo` hace lo mismo. Sin nombre, en un terminal, `newt init` te pregunta si quieres un backend o un monorepo.

El primer backend va en `apps/api`. Elige otra carpeta con `--backend`:

```sh
newt init newthub --monorepo --backend apps/core
```

`--port`, `--db`, `--files` y `--cluster` se aplican a ese primer backend, como en un `newt init` normal. Consulta [instalación](/es/start/installation/#opciones-de-newt-init).

## La distribución

```txt
newthub/
├── package.json        workspaces y scripts de todos los backends
├── AGENTS.md
├── CLAUDE.md
├── .gitignore
└── apps/
    ├── api/            un backend de newt completo
    │   ├── package.json
    │   ├── .env
    │   ├── src/
    │   └── …
    └── admin/          otro, añadido después
```

Cada carpeta de backend es igual que un proyecto creado con `newt init`: su propio `package.json`, `.env`, `src/` y `data/`. Consulta [estructura de un proyecto](/es/start/project-structure/).

El `package.json` de la raíz:

```json title="package.json"
{
  "name": "newthub",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "bun run --filter '*' dev",
    "test": "bun run --filter '*' test",
    "typecheck": "bun run --filter '*' typecheck",
    "lint": "bun run --filter '*' lint"
  },
  "devDependencies": {
    "@newt-js/cli": "^0.0.0",
    "typescript": "7.0.2"
  }
}
```

- `bun install` en la raíz instala todos los backends.
- `bun run dev`, `test`, `typecheck` y `lint` en la raíz se ejecutan en todos los backends.
- Dentro de la carpeta de un backend, los mismos scripts se ejecutan solo para ese backend.
- La raíz también guarda los `overrides` del TypeScript de la lint, porque Bun solo lee los overrides de la raíz.

## Añade un backend

Desde cualquier carpeta del monorepo:

```sh
newt add backend apps/admin
```

```txt
  skipped  package.json (up to date)
  created  apps/admin/package.json
  created  apps/admin/tsconfig.json
  …
  created  apps/admin/CLAUDE.md

Next steps:
  bun install
  cd apps/admin
  bun run dev
```

- El nombre de la carpeta pasa a ser el nombre del paquete, aquí `admin`. Dos paquetes no pueden compartir nombre.
- Si ningún patrón de workspaces cubre la carpeta, newt añade uno al `package.json` de la raíz.
- Cada backend nuevo recibe el siguiente puerto libre: 10 por encima del más alto en uso. El segundo backend sirve en `3010`.
- `newt add backend` acepta `--port`, `--db`, `--files` y `--cluster`, con los mismos valores por defecto que `newt init`.

:::caution
Si das a `--port` un puerto que ya usa otro backend, newt te avisa: una petición podría llegar a cualquiera de los dos. Da a uno de ellos otro `PORT` en su `.env`.
:::

## Ejecuta `newt` en un monorepo

Cada comando `newt add` trabaja sobre un backend. newt lo elige así:

1. Con `--backend <carpeta>`, ese backend.
2. Dentro de la carpeta de un backend, ese backend.
3. En la raíz con un solo backend, ese.
4. Si no, se detiene y pide `--backend`.

```sh
newt add context chat
```

```txt
Which backend? This monorepo has apps/admin, apps/api: add --backend apps/admin
```

```sh
newt add context chat --backend apps/api
```

:::tip
Haz `cd` al backend en el que trabajas. Así cada comando lo encuentra sin `--backend`.
:::

## Lo que newt rechaza

| Ejecutas | newt responde |
|---|---|
| `newt init` con `--backend` pero sin `--monorepo` | añade `--monorepo` |
| `newt init` dentro de un monorepo | usa `newt add backend` |
| `newt init --monorepo` en la carpeta de un backend | un monorepo necesita su propia carpeta |
| `newt add backend` fuera de un monorepo | usa `newt init` |
| `newt add backend` en una carpeta que es otro paquete | usa una carpeta propia |

Para convertir un backend que ya tienes en un monorepo, crea el monorepo en una carpeta nueva y mueve el backend dentro a mano.

## Opciones

```sh
newt init [name] --monorepo [--backend <folder>] [--port <port>] [--db <database>] [--files <storage>] [--cluster <cluster>]
newt add backend <folder> [--port <port>] [--db <database>] [--files <storage>] [--cluster <cluster>]
```

Consulta las referencias de [`newt init`](/es/reference/cli/init/) y [`newt add backend`](/es/reference/cli/add-backend/).
