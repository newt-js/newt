---
title: Configuración
description: Cada fichero, script, variable de entorno y opción de arranque que configura un proyecto newt.
sidebar:
  order: 5
---

Esta página recoge todo lo que configuras en un proyecto newt: sus ficheros, sus scripts, sus variables de entorno y las opciones del código que lo arranca. Todo lo escriben `newt init` y `newt add`; para cambiarlo, editas los ficheros.

## Ficheros

| Fichero | Qué configura |
|---|---|
| `package.json` | Scripts, dependencias y los `overrides` que necesita el lint. |
| `.env` | Tus variables de entorno. Bun lo carga solo. Git lo ignora. |
| `.env.example` | Las mismas variables sin secretos, para subir al repositorio. |
| `tsconfig.json` | TypeScript del backend. |
| `eslint.config.ts` | El lint, [`@newt-js/lint`](/es/reference/lint/). |
| `src/index.ts` | Arranca el backend en `PORT`. |
| `src/backend.ts` | `startBackend`: la plataforma, los contextos y el servidor. |
| `src/stores.ts` | Cómo abre cada contexto su base de datos y su almacenamiento de ficheros. |
| `src/env.ts` | `requiredEnv(name)`: lee una variable o se detiene con `<NAME> is not set: see .env.example`. Solo existe si algún almacén la necesita. |
| `src/contexts.ts` | Qué contextos abre el backend. |
| `src/auth.ts` | Quién llama al backend: mira [Autenticación](/es/guides/authentication/). |
| `src/contexts/<contexto>/app/tsconfig.json` | TypeScript de la app de un contexto (tras `newt add frontend`). |

:::note
Cuando un comando añade variables, agrega las que faltan a `.env` y `.env.example` y nunca cambia un valor que ya tengas.
:::

## Scripts

El `package.json` de un backend:

| Script | Ejecuta | Hace |
|---|---|---|
| `dev` | `bun --watch src/index.ts` | Arranca el backend y lo reinicia con cada cambio. |
| `start` | `bun src/index.ts` | Arranca el backend. |
| `test` | `bun test` | Ejecuta los tests. |
| `typecheck` | `bun check -b` | Comprueba los tipos del backend y de los proyectos a los que hace referencia (las apps de sus contextos). |
| `lint` | `bun --bun eslint` | Ejecuta el lint con Bun. |

En un [monorepo](/es/guides/monorepo/), el `package.json` raíz tiene `dev`, `test`, `typecheck` y `lint`, y cada uno ejecuta `bun run --filter '*' <script>` en todos los workspaces.

### Overrides

El parser del lint necesita la API de TypeScript 6, use tu proyecto el TypeScript que use. Por eso `package.json` la fija para los paquetes de `typescript-eslint`:

```json title="package.json"
"overrides": {
  "typescript-eslint": {
    "typescript": "npm:@typescript/typescript6@6.0.2"
  },
  "@typescript-eslint/parser": {
    "typescript": "npm:@typescript/typescript6@6.0.2"
  }
}
```

La lista real tiene nueve entradas: `typescript-eslint`, `@typescript-eslint/eslint-plugin`, `parser`, `project-service`, `tsconfig-utils`, `type-utils`, `typescript-estree`, `utils` y `ts-api-utils`. En un monorepo van en el `package.json` raíz, el único cuyos overrides lee Bun.

:::caution
No quites estos overrides, aunque tu proyecto use otro TypeScript. El parser del lint necesita TypeScript 6, y son ellos los que le dan esa versión.
:::

## Variables de entorno

`<CONTEXTO>` es el nombre del contexto en mayúsculas, con `-` como `_`: `tasks` da `TASKS`, `web-session` da `WEB_SESSION`. Qué variables tiene un proyecto depende de los `--db`, `--files` y `--cluster` que elegiste en [`newt init`](/es/reference/cli/init/).

Cuando el backend arranca con `stores: 'memory'` (sus tests), no lee ninguna variable de base de datos, ficheros ni clúster.

### Servidor

| Nombre | Significado | Por defecto | Ejemplo |
|---|---|---|---|
| `PORT` | El puerto en el que sirve el backend. Se lee en `src/index.ts`. | `3000` | `PORT=3000` |

`newt init --port` lo escribe en `.env`.

### Base de datos (`--db`)

| Nombre | Con | Significado | Por defecto |
|---|---|---|---|
| `<CONTEXTO>_DATABASE` | `sqlite` (por defecto) | Ruta del fichero SQLite del contexto. | `data/<contexto>.sqlite` |
| `<CONTEXTO>_DATABASE_URL` | `postgres` | URL de la base de datos Postgres del contexto. Obligatoria. | ninguno |
| `<CONTEXTO>_DATABASE_URL` | `mysql` | URL de la base de datos MySQL del contexto. Obligatoria. | ninguno |

Lo que newt escribe en `.env` para un contexto `tasks` de un backend `demo`, una línea por base de datos:

```sh
TASKS_DATABASE=data/tasks.sqlite
TASKS_DATABASE_URL=postgres://postgres:postgres@localhost:5432/demo__tasks
TASKS_DATABASE_URL=mysql://root:root@localhost:3306/demo__tasks
```

Con `--db memory` no hay variable: los datos viven en memoria y se pierden al reiniciar.

Para Postgres y MySQL, newt escribe como nombre de base de datos `<backend>__<contexto>` (los dos en minúsculas, otros caracteres como `_`), así dos backends nunca comparten una. Esa base de datos la creas tú en tu servidor. Mira [Postgres](/es/guides/databases/postgres/) y [MySQL](/es/guides/databases/mysql/).

### Ficheros (`--files`)

Con `local` (por defecto):

| Nombre | Significado | Por defecto | Ejemplo |
|---|---|---|---|
| `PUBLIC_URL` | La dirección pública del backend, para construir las URLs de los ficheros. Obligatoria. | ninguno (se escribe como `http://localhost:<puerto>`) | `PUBLIC_URL=https://newthub.example.com` |
| `FILES_SECRET` | Clave que firma las URLs de los ficheros. Obligatoria, de 32 caracteres o más. | ninguno (`newt init` escribe una aleatoria en `.env`, vacía en `.env.example`) | `FILES_SECRET=f53a3e6c…` |
| `<CONTEXTO>_FILES` | Carpeta donde el contexto guarda sus ficheros. | `data/files/<contexto>` | `TASKS_FILES=data/files/tasks` |

Con `s3`:

| Nombre | Significado | Por defecto | Ejemplo |
|---|---|---|---|
| `S3_ACCESS_KEY_ID` | Clave de acceso. Obligatoria. | ninguno | |
| `S3_SECRET_ACCESS_KEY` | Clave secreta. Obligatoria. | ninguno | |
| `S3_REGION` | Región. | `us-east-1` | `S3_REGION=eu-west-1` |
| `S3_ENDPOINT` | Endpoint de un servicio compatible con S3. | ninguno | `S3_ENDPOINT=http://localhost:9000` |
| `<CONTEXTO>_S3_BUCKET` | El bucket del contexto. Obligatoria. | ninguno (se escribe como `<backend>--<contexto>`) | `TASKS_S3_BUCKET=demo--tasks` |

:::danger[FILES_SECRET en producción]
Da a cada despliegue su propio secreto aleatorio de 32 caracteres o más, y nunca subas `.env` al repositorio. Quien tenga el secreto puede firmar URLs de ficheros; si lo cambias, las URLs ya entregadas dejan de funcionar.
:::

Con `--files memory` no hay variable. Mira [Ficheros](/es/concepts/files/).

### Clúster (`--cluster`)

Con `--cluster valkey`:

| Nombre | Significado | Por defecto | Ejemplo |
|---|---|---|---|
| `VALKEY_URL` | El servidor Valkey (o Redis) que comparten las instancias. | el de Bun: `REDIS_URL` y, si no, `valkey://localhost:6379` | `redis://localhost:6379` |

Con `memory` (por defecto) no hay variable. Mira [Varias instancias](/es/guides/scaling/).

### Tests

Con `--db postgres` o `--db mysql`:

| Nombre | Significado | Por defecto | Ejemplo |
|---|---|---|---|
| `TEST_DATABASE_URL` | Un servidor donde los tests de los módulos pueden crear y borrar bases de datos. Cada test recibe una base de datos nueva con las migraciones del contexto. | ninguno: los tests usan una base de datos en memoria | `postgres://postgres:postgres@localhost:5432/postgres` |

La lee `src/test-database.ts`, que solo existe con Postgres o MySQL. Con SQLite, los tests de los módulos ejecutan las migraciones del contexto sobre una base de datos SQLite en memoria. Mira [Testing](/es/guides/testing/).

## startBackend

`src/backend.ts` exporta la función que lo arranca todo:

```ts title="src/backend.ts"
export async function startBackend(
  port: number,
  { stores = 'configured' }: { stores?: Stores } = {},
): Promise<RunningContexts> {
  const platform = new Platform()
  const contexts = await openContexts(platform, stores)
  return runContexts(contexts, {
    platformWithoutContexts: platform,
    serve: { port, health: true },
  })
}
```

| Parámetro | Significado | Por defecto |
|---|---|---|
| `port` | El puerto en el que sirve. | ninguno (`src/index.ts` pasa `PORT`, o `3000`) |
| `stores` | `'configured'` abre los almacenes según el entorno; `'memory'` abre otros nuevos en memoria, como quieren los tests. | `'configured'` |

Devuelve `RunningContexts`: `server`, `servers` y `stop()`. Mira [API HTTP](/es/reference/http/).

## Platform

Lo que comparten todos los contextos del backend. `new Platform(options?)`, de `@newt-js/core/application`:

| Opción | Significado | Por defecto |
|---|---|---|
| `cluster` | Lo que comparten las instancias: `new MemoryCluster()` o `new ValkeyCluster(url?)`. | `new MemoryCluster()` |
| `logger` | A dónde van los logs. | `new ConsoleLogger()` |
| `observability` | A dónde van las trazas y las métricas. | ninguno (no se registra nada) |

`platform.useLogger(logger)` y `platform.useObservability(observability)` los cambian después. Mira [Logs y observabilidad](/es/concepts/logs/).

## runContexts

`runContexts(contexts, options)`, de `@newt-js/core/http`, arranca los workers de los contextos y el servidor, y los detiene con `SIGINT` y `SIGTERM`.

| Opción | Significado | Por defecto |
|---|---|---|
| `serve` | Las opciones del servidor (las de la tabla siguiente), sin `routers`: sirve el router de cada contexto. | sin servidor compartido |
| `signals` | Detenerse con `SIGINT` y `SIGTERM`. | `true` |
| `stopTimeoutMs` | Cuánto puede tardar cada paso de la parada. | `8000` |
| `platformWithoutContexts` | La plataforma que se usa cuando no hay contextos. Si hay contextos, tiene que ser la suya. | ninguno |

Las opciones de `serve` que usa el proyecto generado:

| Opción | Significado | Por defecto |
|---|---|---|
| `port` | El puerto. Obligatoria. | ninguno |
| `health` | `true` responde a `GET /health-check` con `{ "status": "ok" }` (`503` y `"stopping"` mientras se detiene), y `GET /<contexto>/health-check` para cada contexto que sirve rutas. | desactivado |

`serve` tiene más opciones (`maxBodyBytes`, `trustProxy`, `securityHeaders`, `hsts`, `csp`, `proxy`, `drainMs`, `idleTimeoutSeconds`, `development`, `publicFolder`, `routes`). Mira [API HTTP](/es/reference/http/).

## Opciones de un contexto

Cada contexto crea un `ContextBase` en su `<contexto>.context.ts`:

```ts title="src/contexts/tasks/tasks.context.ts"
const base = new ContextBase({
  name: 'tasks',
  platform,
  database,
  storage: await openStorage('tasks', router, stores),
})
```

| Opción | Significado | Por defecto |
|---|---|---|
| `name` | El nombre del contexto. Sin `:`. | ninguno |
| `platform` | La plataforma compartida. | ninguno |
| `database` | La base de datos del contexto, de `openDatabase`. | ninguno |
| `storage` | `{ private?, public? }`: dónde van sus ficheros, de `openStorage`. | ninguno |
| `clock` | El reloj del que lee la hora. | el reloj del sistema |
| `worker` | Los ajustes del worker: `concurrency`, `pollMs`, `leaseMs`, `backoffMs`, `maxBackoffMs`, `keepDoneMs`, `seenEveryMs`, `orphansCheckEveryMs`. | mira [@newt-js/core](/es/reference/core/) |
| `writeRule` | `'off'`, `'warn'` o `'error'`: qué pasa cuando un caso de uso escribe en otro módulo fuera de un worker, o guarda dos módulos en una transacción. | `'error'` |
| `guardRule` | `'off'`, `'warn'` o `'error'`: qué pasa cuando un guardado lee tablas pero no protege nada. | `'error'` |
| `conflictRetries` | `{ times, duplicates, backoffMs }`: cómo reintenta un caso de uso cuando su escritura entra en conflicto. | `{ times: 3, duplicates: 1, backoffMs: 10 }` |

## TypeScript

```json title="tsconfig.json"
{
  "compilerOptions": {
    "lib": ["ESNext"],
    "target": "ESNext",
    "module": "Preserve",
    "moduleDetection": "force",
    "moduleResolution": "bundler",
    "types": ["bun"],
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "src/contexts/*/app"],
  "references": [{ "path": "./src/contexts/tasks/app" }]
}
```

El `exclude` y las `references` de las apps aparecen tras `newt add frontend`. Cada app tiene su propio `tsconfig.json`, con `DOM` en `lib`, `"jsx": "react-jsx"` y `"composite": true`, así que `bun check -b` la comprueba como un proyecto aparte. Su `rootDir` es el contexto, e incluye los schemas del contexto con sus value objects y sus errores, para que la app compruebe los tipos de los DTOs que importa.

## ESLint

```ts title="eslint.config.ts"
import { newt } from '@newt-js/lint'

export default newt({
  root: import.meta.dirname,
  contexts: { folder: 'src/contexts' },
})
```

Opciones y reglas: [Reglas de lint](/es/reference/lint/).
