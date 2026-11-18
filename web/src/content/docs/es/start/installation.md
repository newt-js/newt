---
title: Instalación
description: Lo que necesitas en tu ordenador, y cómo ejecutar el comando newt.
sidebar:
  order: 2
---

newt funciona sobre Bun. Instalas Bun una vez, y el comando `newt` viene con cada proyecto.

## Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Bun | 1.4.0 o posterior | ejecuta el backend, los tests y el CLI |
| Git | cualquiera | opcional, para guardar tu proyecto |

Instala Bun como indica https://bun.sh y compruébalo:

```sh
bun --version
```

No necesitas Node.js, ni un servidor de base de datos, ni Docker. La base de datos por defecto es SQLite, que viene integrada en Bun.

## Crear un proyecto

Cualquiera de estos comandos crea un backend nuevo en la carpeta `my-app`:

```sh
bun create newt my-app
```

```sh
bunx @newt-js/cli init my-app
```

Los dos ejecutan el mismo `newt init`, con las mismas opciones. `npm create newt my-app` también funciona si tienes Bun instalado; sin Bun, te dice cómo conseguirlo.

:::caution
Antes de que exista un proyecto, escribe `bunx @newt-js/cli`, no `bunx newt`. El paquete de npm llamado `newt` es otro programa.
:::

## El comando `newt` dentro de un proyecto

Cada proyecto incluye `@newt-js/cli` en sus `devDependencies`. Después de `bun install`, ejecútalo desde cualquier carpeta del proyecto:

```sh
bunx newt --help
bunx newt add context tasks
```

Esta documentación escribe `newt ...` para abreviar. Léelo como `bunx newt ...`.

Si ejecutas dentro de un proyecto un `newt` instalado en otro sitio, este pasa el comando a la copia del propio proyecto. Así el código que escribe siempre encaja con la versión de newt del proyecto.

## Opciones de todos los comandos

| Opción | Qué hace |
|---|---|
| `--dry-run` | muestra lo que cambiaría, sin escribir nada |
| `--json` | muestra el resultado en JSON |
| `-h`, `--help` | muestra la ayuda |
| `-v`, `--version` | muestra la versión (`newt -v`) |

Con `--json`, un comando imprime `{ dryRun, files: [{ path, status, note? }], warnings, nextSteps }`, o `{ error }` con código de salida 1.

Un comando nunca sobrescribe un fichero que ya existe. Si lo ejecutas dos veces, la segunda se salta lo que ya está.

## Opciones de `newt init`

```sh
newt init [name] [--port <port>] [--db <database>] \
  [--files <storage>] [--cluster <cluster>] [--monorepo] \
  [--backend <folder>]
```

| Opción | Valores | Por defecto |
|---|---|---|
| `--port` | de 1 a 65535 | `3000` |
| `--db` | `sqlite`, `postgres`, `mysql`, `memory` | `sqlite` |
| `--files` | `local`, `s3`, `memory` | `local` |
| `--cluster` | `memory`, `valkey` | `memory` |
| `--monorepo` | | desactivada |
| `--backend` | una carpeta | `apps/api` |

- `name` es la carpeta nueva. `newt init .` usa la carpeta actual y le da su nombre al proyecto.
- Sin nombre, en un terminal, newt te pregunta el nombre y si quieres un backend o un monorepo.
- `--db` elige la base de datos que abre cada contexto. Consulta [SQLite](/es/guides/databases/sqlite/), [Postgres](/es/guides/databases/postgres/) y [MySQL](/es/guides/databases/mysql/).
- `--files` elige dónde guardan los contextos los ficheros subidos: una carpeta local o S3. Consulta [ficheros](/es/concepts/files/).
- `memory`, en `--db` o `--files`, lo guarda todo en memoria y lo pierde cuando el backend se para. Sirve para una prueba rápida, no para una aplicación.
- `--cluster` elige qué comparten varias instancias en marcha. Consulta [varias instancias](/es/guides/scaling/).
- `--monorepo` y `--backend` se explican en [monorepos](/es/guides/monorepo/).

Todas las opciones están en la [referencia de `newt init`](/es/reference/cli/init/).

:::tip
Deja los valores por defecto en tu primer proyecto. SQLite, los ficheros locales y el clúster en memoria no necesitan nada más en tu ordenador.
:::

## Configurar el editor

Un proyecto no necesita ningún plugin del editor, pero dos ayudan:

- **TypeScript**: tu editor lee `tsconfig.json`. Una app, si añades una, tiene su propio `tsconfig.json` en su carpeta.
- **ESLint**: el proyecto tiene un `eslint.config.ts` con las reglas de newt. Una extensión de ESLint te las muestra mientras escribes, las mismas que informa `bun run lint`.

## Siguientes pasos

Construye [tu primer proyecto](/es/start/first-project/).
