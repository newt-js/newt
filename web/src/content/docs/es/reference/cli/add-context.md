---
title: newt add context
description: Añade un contexto al backend, con su propia base de datos y sus propios ficheros.
sidebar:
  order: 3
---

`newt add context` añade un contexto: una parte de tu app con su propia base de datos, como `tasks` o `chat`. Abre el mismo tipo de base de datos y de almacenamiento de ficheros que el resto del backend.

## Uso

```sh
newt add context <name> [options]
```

## Argumentos

| Argumento | Significa |
|---|---|
| `name` | El nombre del contexto, como `tasks` o `web-session` |

## Opciones

| Opción | Por defecto | Significa |
|---|---|---|
| `--backend <folder>` | en el que estás | El backend, en un monorepo con varios |

También acepta los [flags globales](/es/reference/cli/overview/#flags-globales).

## Reglas del nombre

- Letras minúsculas y dígitos, palabras unidas por `-`, empezando por una letra: `tasks`, `web-session`.
- No `api`: su frontend se serviría en `/api`, donde están las rutas.
- Con Postgres o MySQL, la base de datos se llama `<backend>__<contexto>`; con S3, el bucket es `<backend>--<contexto>`. Cada uno debe caber en 63 caracteres.

De `web-session`, newt saca `WebSession` (nombres de clases), `webSession` (variables) y `WEB_SESSION` (variables de entorno).

## Qué escribe

```sh
newt add context chat
```

```text
  created  src/contexts/chat/chat.context.ts
  created  src/contexts/chat/chat-modules.ts
  created  src/contexts/chat/migrations/.gitkeep
  skipped  src/auth.ts (already exists)
  updated  .env
  updated  .env.example
  updated  src/contexts.ts

Next steps:
  bun run dev
```

- `src/contexts.ts` recibe una línea que abre el contexto.
- `src/auth.ts` solo se escribe si falta.
- `.env` y `.env.example` reciben las variables del contexto, según la base de datos y los ficheros del backend:

| El backend usa | Variable añadida | Valor |
|---|---|---|
| `sqlite` | `CHAT_DATABASE` | `data/chat.sqlite` |
| `postgres` | `CHAT_DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/<backend>__chat` |
| `mysql` | `CHAT_DATABASE_URL` | `mysql://root:root@localhost:3306/<backend>__chat` |
| ficheros `local` | `CHAT_FILES` | `data/files/chat` |
| ficheros `s3` | `CHAT_S3_BUCKET` | `<backend>--chat` |

`memory` no añade nada. Los valores que ya están en `.env` se conservan.

## Siguientes pasos

- Con Postgres o MySQL: crea la base de datos del contexto en tu servidor, como dice `<CONTEXTO>_DATABASE_URL`.
- Con S3: pon en `<CONTEXTO>_S3_BUCKET` de `.env` su bucket.
- `bun run dev`

:::caution
Con Postgres o MySQL, este comando no crea la base de datos: créala en tu servidor antes de `bun run dev`.
:::

## Errores

- **Un nombre no válido**: `'<name>' cannot name a context: lowercase words joined by -`.
- **`api`**: se rechaza.
- **Un nombre de base de datos o de bucket de más de 63 caracteres**: se rechaza; dale al contexto un nombre más corto.
- **`src/stores.ts` no abre ninguna base de datos o almacenamiento que newt conozca**: se rechaza, porque newt no sabe qué debe abrir el contexto.
- **No encuentra el backend**: mira [Visión general](/es/reference/cli/overview/#reglas-que-siguen-todos-los-comandos).

Mira [Contextos y módulos](/es/concepts/contexts-and-modules/).
