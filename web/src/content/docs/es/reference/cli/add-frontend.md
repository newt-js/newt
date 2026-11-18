---
title: newt add frontend
description: Añade una app React a un contexto, servida por el backend en /<context>.
sidebar:
  order: 14
---

`newt add frontend` da a un contexto su app, servida por el mismo backend en `/<context>`, como `/tasks`. Escribe una pequeña app React que empaqueta Bun, o sirve una que construyes en otro sitio.

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
| `--built <folder>` | ninguna | Sirve una app construida en otro sitio, desde la carpeta de su `index.html` |
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

- Sin `--built`, newt escribe una app React en `src/contexts/<context>/app/`.
- Con `--built`, la carpeta tiene que estar construida para `/<context>/`, como con `vite build --base=/<context>/`. Su ruta es relativa a donde ejecutas el comando.

## Qué escribe

```sh
newt add frontend tasks
```

```text
  created  src/contexts/tasks/app/index.html
  created  src/contexts/tasks/app/main.tsx
  created  src/contexts/tasks/app/app.tsx
  created  src/contexts/tasks/app/base.ts
  created  src/contexts/tasks/app/tsconfig.json
  updated  package.json
  updated  tsconfig.json
  updated  src/contexts/tasks/tasks.context.ts
  updated  src/backend.test.ts

Next steps:
  bun install
  bun run dev, and open /tasks
```

```ts title="src/contexts/tasks/tasks.context.ts"
import app from './app/index.html'
// …
    return { context: new Tasks_Context(base, tasksModules(base, router)), router, app }
```

- `app/base.ts` guarda dónde se sirve la app, `BASE`, y su API, `API`.
- `app/tsconfig.json` recoge también los schemas del contexto, sus value objects y sus errores, para que la app compruebe los tipos de los DTOs que importa.
- `package.json` recibe `react` y `react-dom`, con `@types/react` y `@types/react-dom` como devDependencies.
- `tsconfig.json` deja fuera las carpetas de las apps y referencia el `tsconfig.json` propio de la app.
- `src/backend.test.ts` recibe un test de que se sirve la página de la app.
- Con `--built web/dist`, solo cambian `tasks.context.ts` y `src/backend.test.ts`: el contexto entrega `app: join(import.meta.dir, '../../../web/dist')`, y el test se ejecuta cuando la carpeta tiene un `index.html`.

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
- **El contexto ya entrega una app, en `<context>.context.ts`**: rechazado; quita esa primero.
- **Una carpeta `--built` que contiene el backend**: rechazado, porque se serviría todo lo que hay dentro, `.env` incluido.

:::danger
Apunta `--built` solo a la salida de la build, como `web/dist`. Todo lo que hay en esa carpeta es público.
:::

Consulta [Añadir un frontend](/es/guides/frontend/).
