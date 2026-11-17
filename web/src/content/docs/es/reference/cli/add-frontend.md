---
title: newt add frontend
description: Añade un frontend React a un contexto, servido por el backend en /<context>.
sidebar:
  order: 14
---

`newt add frontend` añade una web a un contexto, servida por el mismo backend en `/<context>`, como `/tasks`. Escribe una pequeña app React que empaqueta Bun, o sirve una que construyes en otro sitio.

## Uso

```sh
newt add frontend <context> [options]
```

## Argumentos

| Argumento | Significado |
|---|---|
| `context` | Un contexto del backend, como `tasks` |

## Opciones

| Opción | Por defecto | Significado |
|---|---|---|
| `--built <folder>` | ninguna | Sirve un frontend construido en otro sitio, desde la carpeta de su `index.html` |
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

- Sin `--built`, newt escribe una app React en `src/contexts/<context>/frontend/`.
- Con `--built`, la carpeta tiene que estar construida para `/<context>/`, como con `vite build --base=/<context>/`. Su ruta es relativa a donde ejecutas el comando.

## Qué escribe

```sh
newt add frontend tasks
```

```text
  created  src/contexts/tasks/frontend/index.html
  created  src/contexts/tasks/frontend/main.tsx
  created  src/contexts/tasks/frontend/app.tsx
  created  src/contexts/tasks/frontend/tsconfig.json
  updated  package.json
  updated  tsconfig.json
  created  src/frontends.ts
  created  src/frontends.test.ts
  updated  src/backend.ts

Next steps:
  bun install
  bun run dev, and open /tasks
```

```ts title="src/frontends.ts"
import type { FrontendMount } from '@newt-js/core/http'
import tasksFrontend from './contexts/tasks/frontend/index.html'

export const frontends: FrontendMount[] = [
  { path: '/tasks', app: tasksFrontend },
]
```

- `package.json` recibe `react` y `react-dom`, con `@types/react` y `@types/react-dom` como devDependencies.
- `tsconfig.json` deja fuera las carpetas de los frontends y referencia el `tsconfig.json` propio del frontend.
- `src/backend.ts` pasa `frontend: frontends` a `serve`.
- Con `--built web/dist`, solo cambian `src/frontends.ts`, `src/frontends.test.ts` y `src/backend.ts`, y el montaje es `{ path: '/tasks', app: join(import.meta.dir, '../web/dist') }`.

## Avisos

- Con `--built`, una carpeta sin `index.html` todavía: el backend responde 503 en `/<context>` hasta que se construya.

## Siguientes pasos

Sin `--built`:

1. `bun install`
2. `bun run dev`, y abre `/<context>`

Con `--built`: constrúyelo en la carpeta para `/<context>/`, o sus assets responderán 404. Después, `bun run dev` y abre `/<context>/`.

## Errores

- **Falta el contexto**: `newt add frontend takes the context, as in newt add frontend sales`.
- **Un contexto que el backend no tiene**: rechazado; añádelo con [`newt add context`](/es/reference/cli/add-context/).
- **`/<context>` ya sirve otro frontend en `src/frontends.ts`**: rechazado; quita ese primero.
- **Una carpeta `--built` que contiene el backend**: rechazado, porque se serviría todo lo que hay dentro, `.env` incluido.

:::danger
Apunta `--built` solo a la salida de la build, como `web/dist`. Todo lo que hay en esa carpeta es público.
:::

Consulta [Añadir un frontend](/es/guides/frontend/).
