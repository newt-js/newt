---
title: Añadir un frontend
description: Da a un contexto una aplicación React, servida por el mismo backend en la ruta del propio contexto.
sidebar:
  order: 5
---

La app de un contexto es una aplicación web que el backend sirve junto a la API del contexto. `newt add frontend` da a un contexto una aplicación React, empaquetada por Bun y servida en `/<contexto>`, sin un servidor aparte ni un paso de build.

## Añade uno

```sh
newt add frontend tasks
```

```txt
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

Ejecuta `bun install` para instalar React, luego `bun run dev`, y abre http://localhost:3000/tasks.

El contexto tiene que existir antes. Cada contexto tiene como mucho una app, en `/<contexto>`.

## Lo que escribe

| Fichero | Para qué sirve |
|---|---|
| `app/index.html` | la página; carga `main.tsx` |
| `app/main.tsx` | monta la aplicación React en `#root` |
| `app/app.tsx` | tu aplicación |
| `app/base.ts` | dónde se sirve la app, `/tasks`, y su API, `/tasks/api` |
| `app/tsconfig.json` | TypeScript para el navegador, con JSX, el DOM y los schemas del contexto |

También cambia cuatro ficheros:

- `package.json`: añade `react`, `react-dom` y sus tipos.
- `tsconfig.json`: deja fuera `src/contexts/*/app` y referencia el `tsconfig.json` propio de la app, para que `bun run typecheck` compruebe los dos.
- `src/contexts/tasks/tasks.context.ts`: entrega su app para ejecutarla, junto a su router.
- `src/backend.test.ts`: comprueba que se sirve la página de la app.

```ts title="src/contexts/tasks/app/app.tsx"
export function App() {
  return <h1>Tasks</h1>
}
```

## Cómo se sirve

El contexto entrega su app para ejecutarla, junto a su router:

```ts title="src/contexts/tasks/tasks.context.ts"
import app from './app/index.html'

  static async open(platform: Platform, stores: Stores): Promise<ContextToRun> {
    // …
    return { context: new Tasks_Context(base, tasksModules(base, router)), router, app }
  }
```

`app` es un import de HTML o la carpeta de una aplicación ya compilada. Al importar un fichero `.html`, Bun obtiene un HTML bundle: empaqueta la página con sus scripts y estilos y sirve el resultado.

- `/tasks` y cualquier ruta por debajo, como `/tasks/board/12`, responden con la página, así que tu aplicación puede tener sus propias rutas en el cliente.
- `/tasks/api/…` sigue siendo la API del contexto, y `/tasks/health-check` su salud: una ruta ahí que no coge ninguna ruta da 404, nunca la página.
- Las apps de dos contextos nunca se pisan: cada una está bajo su contexto.

## Mientras desarrollas

`bun run dev` reinicia el backend cuando cambias código del servidor. El backend generado no activa el modo de desarrollo de Bun, así que la página se empaqueta una vez: después de cambiar el frontend, reinicia `bun run dev` para verlo.

Para tener recarga en caliente en el navegador, activa `development` en `src/backend.ts`:

```ts title="src/backend.ts"
return runContexts(contexts, {
  platformWithoutContexts: platform,
  serve: {
    port,
    development: Bun.env.NODE_ENV !== 'production',
  },
})
```

Así Bun vuelve a empaquetar la página cada vez que guardas y la recarga en el navegador.

:::caution
Deja `development` desactivado en producción. En modo de desarrollo, Bun sirve el código sin minificar y muestra su propia página ante errores inesperados.
:::

## Llama a la API

La página y la API comparten origen, así que llama a la API por su ruta. `base.ts` la guarda, y la app importa los tipos de los schemas de su contexto, así nunca copia un DTO a mano:

```tsx title="src/contexts/tasks/app/app.tsx"
import { useEffect, useState } from 'react'
import type { TaskDTO } from '../modules/task/task.schema'
import { API } from './base'

export function App() {
  const [tasks, setTasks] = useState<TaskDTO[]>([])

  useEffect(() => {
    fetch(`${API}/tasks`)
      .then(response => response.json())
      .then(page => setTasks(page.items))
  }, [])

  return (
    <ul>
      {tasks.map(task => <li key={task.id}>{task.name}</li>)}
    </ul>
  )
}
```

- El navegador envía las cookies del backend con estas peticiones, así que una cookie de sesión las identifica. Consulta [autenticación](/es/guides/authentication/).
- Mientras `src/auth.ts` no identifique a nadie, la API también responde 401 a la página.
- Un `POST`, `PUT`, `PATCH` o `DELETE` desde la página pasa la comprobación de origen, porque sale del propio origen del backend.

:::tip
Lee el `code` de una respuesta de error, como `task.not_found`, para decidir qué muestra la página. Consulta [errores](/es/concepts/errors/).
:::

- La app importa sus propios ficheros y, con `import type`, los schemas de su contexto: nunca el código del servidor. Lo comprueba la regla [`frontend-imports`](/es/reference/lint/#newtfrontend-imports).
- Dale `BASE` como base a un router de cliente, como el `basename` de React Router.

## Una app compilada aparte

Si compilas tu app con otra herramienta, el contexto puede servir la carpeta compilada:

```sh
newt add frontend tasks --built web/dist
```

- `--built` recibe la carpeta que contiene el `index.html` compilado.
- Compílalo para `/<contexto>/`, como `vite build --base=/tasks/`, o sus recursos responderán 404.
- Mientras esa carpeta no tenga `index.html`, `/tasks` responde 503.
- Los ficheros que existen se sirven tal cual. Cualquier otra ruta bajo `/tasks` recibe `index.html`.
- El contexto la entrega como `app: join(import.meta.dir, '../../../web/dist')`, desde su propia carpeta.
- Sus páginas HTML llevan una Content-Security-Policy y `X-Frame-Options: DENY`. Cambia la política con la opción `csp` del servidor.

La carpeta no puede contener el backend, porque se serviría todo lo que hay dentro, `.env` incluido.

## Opciones

```sh
newt add frontend <context> [--built <folder>] [--backend <folder>]
```

| Opción | Qué hace |
|---|---|
| `--built` | sirve una carpeta compilada aparte, en vez de escribir una aplicación React |
| `--backend` | qué backend, en un monorepo con varios |

Consulta la [referencia de `newt add frontend`](/es/reference/cli/add-frontend/).
