---
title: Postgres
description: Cada contexto en su propia base de datos Postgres.
sidebar:
  order: 2
---

Postgres es un servidor de base de datos: tu backend se conecta a él por la red en lugar de abrir un fichero. Úsalo cuando varias instancias de tu backend deban compartir una base de datos, o cuando ya tengas Postgres.

## Crear un backend con Postgres

1. Crea el backend con `--db postgres`:

   ```sh
   newt init newthub --db postgres
   cd newthub
   newt add context tasks
   ```

2. Arranca un servidor Postgres para desarrollo, si no tienes uno. Con Docker:

   ```sh
   docker run -d --name newthub-postgres -e POSTGRES_PASSWORD=postgres \
     -p 5432:5432 postgres
   ```

3. Crea una base de datos por contexto (consulta [Crear las bases de datos](#crear-las-bases-de-datos)):

   ```sh
   docker exec newthub-postgres createdb -U postgres newthub__tasks
   ```

4. Arranca el backend:

   ```sh
   bun run dev
   ```

Al arrancar, cada contexto se conecta a su base de datos y ejecuta sus migraciones.

## Una base de datos por contexto

Cada contexto tiene su propia base de datos, y su propia variable para ella. `newt add context tasks` la escribe en `.env` y en `.env.example`:

```sh title=".env"
TASKS_DATABASE_URL=postgres://postgres:postgres@localhost:5432/newthub__tasks
```

- La variable es el nombre de la carpeta del contexto en mayúsculas, con `-` cambiado por `_`, más `_DATABASE_URL`.
- El nombre de base de datos que propone es `<backend>__<context>`: el nombre del paquete del backend y la carpeta del contexto, con todo lo que no sea letra o número cambiado por `_`. Dos backends en un mismo servidor nunca comparten base de datos.
- La variable es obligatoria. Sin ella el backend no arranca: `TASKS_DATABASE_URL is not set: see .env.example`.

`src/stores.ts` abre cada una:

```ts title="src/stores.ts"
export async function openDatabase(
  context: string,
  migrations: string,
  stores: Stores,
): Promise<Database> {
  if (stores === 'memory') {
    return new MemoryDatabase()
  }
  return PostgresDatabase.open({
    url: requiredEnv(`${envOf(context)}_DATABASE_URL`),
    migrations,
  })
}
```

:::tip
Las bases de datos pueden estar en un servidor o en varios. Cada contexto solo conoce su propia URL, así que más adelante puedes mover un contexto a otro servidor cambiando una variable.
:::

## Crear las bases de datos

newt no crea bases de datos: cada una debe existir antes de arrancar el backend. Crea una por contexto, con la herramienta que prefieras.

Con `psql`:

```sql
CREATE DATABASE newthub__tasks;
```

Las migraciones que genera newt declaran sus columnas de texto con `COLLATE "C"`, así que el locale por defecto de la base de datos no importa. Si prefieres columnas `TEXT` sin más, crea la base de datos con el locale `C`:

```sql
CREATE DATABASE newthub__tasks TEMPLATE template0 LOCALE 'C';
```

El usuario de la URL necesita poder crear tablas en la base de datos: las migraciones se ejecutan con ese usuario.

## Migraciones

Los ficheros SQL de cada contexto están en `src/contexts/<context>/migrations/`. `newt add module tasks/task` escribe la versión para Postgres:

```sql title="src/contexts/tasks/migrations/00001_task_up.sql"
CREATE TABLE "task" (
  id TEXT COLLATE "C" PRIMARY KEY,
  version INTEGER NOT NULL,
  name TEXT COLLATE "C" NOT NULL,
  created_at TEXT COLLATE "C" NOT NULL,
  updated_at TEXT COLLATE "C" NOT NULL
);
```

- `PostgresDatabase.open` ejecuta todas las migraciones pendientes al arrancar el backend, junto con las tablas propias de newt (`newt_job`, `newt_schedule_tick` y otras).
- Es seguro que varias instancias arranquen a la vez: newt toma un bloqueo mientras migra, así que cada migración se ejecuta una sola vez.
- newt revisa todas las columnas de texto al abrir la base de datos. Una columna que compararía u ordenaría el texto de forma distinta a otras bases de datos impide el arranque, con un mensaje que la nombra.

:::caution
Escribe `COLLATE "C"` en cada columna de texto que añadas, como hacen las migraciones generadas. Sin él, el backend se niega a arrancar en una base de datos cuyo locale no sea `C`.
:::

Para valores JSON usa `jsonb`, para valores sí/no `boolean` y para números enteros por encima de 2^31 `bigint`. Más en [Base de datos y migraciones](/es/concepts/database/).

## Opciones de conexión

`PostgresDatabase.open(options)` recibe:

| Opción | Por defecto | Qué es |
|---|---|---|
| `url` | obligatoria | La URL de la base de datos |
| `migrations` | ninguna | La carpeta de migraciones del contexto |
| `connections` | `10` | Conexiones del pool |
| `waitTimeoutMs` | `30000` | Cuánto espera un guardado a un bloqueo |

newt se conecta con el cliente SQL de Bun (`Bun.SQL`). También funcionan las opciones que este lee de la URL, como TLS:

```sh title=".env"
TASKS_DATABASE_URL=postgres://app:secret@db.example.com:5432/newthub__tasks?sslmode=require
```

Para cambiar el tamaño del pool, edita `src/stores.ts`:

```ts title="src/stores.ts"
return PostgresDatabase.open({
  url: requiredEnv(`${envOf(context)}_DATABASE_URL`),
  migrations,
  connections: 20,
})
```

:::note
Cada contexto tiene su propio pool. Tres contextos con el valor por defecto abren hasta 30 conexiones por instancia. Tenlas en cuenta frente al `max_connections` de tu servidor.
:::

## Tests en Postgres

Los tests de un backend con Postgres se ejecutan en memoria salvo que definas `TEST_DATABASE_URL`. Con ella, cada test crea su propia base de datos en ese servidor, ejecuta tus migraciones y la borra. Consulta [Testing](/es/guides/testing/#tests-de-módulo-en-postgres-o-mysql).

```sh
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
  bun test
```
