---
title: MySQL
description: Cada contexto en su propia base de datos MySQL.
sidebar:
  order: 3
---

MySQL es un servidor de base de datos: tu backend se conecta a él por la red en lugar de abrir un fichero. Úsalo cuando varias instancias de tu backend deban compartir una base de datos, o cuando ya tengas MySQL.

newt necesita MySQL 8.0 o posterior, que tiene la collation `utf8mb4_0900_bin` que usan las columnas de texto de newt.

## Crear un backend con MySQL

1. Crea el backend con `--db mysql`:

   ```sh
   newt init newthub --db mysql
   cd newthub
   newt add context tasks
   ```

2. Arranca un servidor MySQL para desarrollo, si no tienes uno. Con Docker:

   ```sh
   docker run -d --name newthub-mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 mysql
   ```

3. Crea una base de datos por contexto (consulta [Crear las bases de datos](#crear-las-bases-de-datos)):

   ```sh
   docker exec newthub-mysql mysql -uroot -proot -e "CREATE DATABASE newthub__tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin"
   ```

4. Arranca el backend:

   ```sh
   bun run dev
   ```

Al arrancar, cada contexto se conecta a su base de datos y ejecuta sus migraciones.

## Una base de datos por contexto

Cada contexto tiene su propia base de datos, y su propia variable para ella. `newt add context tasks` la escribe en `.env` y en `.env.example`:

```sh title=".env"
TASKS_DATABASE_URL=mysql://root:root@localhost:3306/newthub__tasks
```

- La variable es el nombre de la carpeta del contexto en mayúsculas, con `-` cambiado por `_`, más `_DATABASE_URL`.
- El nombre de base de datos que propone es `<backend>__<context>`: el nombre del paquete del backend y la carpeta del contexto, con todo lo que no sea letra o número cambiado por `_`. Dos backends en un mismo servidor nunca comparten base de datos.
- La variable es obligatoria. Sin ella el backend no arranca: `TASKS_DATABASE_URL is not set: see .env.example`.

`src/stores.ts` abre cada una:

```ts title="src/stores.ts"
export async function openDatabase(context: string, migrations: string, stores: Stores): Promise<Database> {
  if (stores === 'memory') {
    return new MemoryDatabase()
  }
  return MysqlDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })
}
```

## Crear las bases de datos

newt no crea bases de datos: cada una debe existir antes de arrancar el backend. Crea una por contexto, con la collation binaria:

```sql
CREATE DATABASE newthub__tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
```

Con esa collation, el texto se compara y se ordena por sus caracteres exactos, igual que en SQLite y Postgres. El usuario de la URL necesita poder crear tablas en la base de datos: las migraciones se ejecutan con ese usuario.

:::tip
Si creas la base de datos con `utf8mb4_0900_bin`, toda tabla que añadas la toma por defecto, aunque una migración olvide indicarlo.
:::

## Migraciones

Los ficheros SQL de cada contexto están en `src/contexts/<context>/migrations/`. `newt add module tasks/task` escribe la versión para MySQL:

```sql title="src/contexts/tasks/migrations/00001_task_up.sql"
CREATE TABLE `task` (
  id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,
  version INTEGER NOT NULL,
  name VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL,
  created_at VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL,
  updated_at VARCHAR(255) COLLATE utf8mb4_0900_bin NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin;
```

- `MysqlDatabase.open` ejecuta todas las migraciones pendientes al arrancar el backend, junto con las tablas propias de newt (`newt_job`, `newt_schedule_tick` y otras).
- Es seguro que varias instancias arranquen a la vez: newt toma un bloqueo mientras migra, así que cada migración se ejecuta una sola vez.
- newt revisa todas las columnas de texto al abrir la base de datos. Una columna con otra collation impide el arranque, con un mensaje que la nombra.

:::caution
MySQL confirma cada `CREATE TABLE` o `ALTER TABLE` por separado, aunque esté dentro de una transacción. Si una migración con varias sentencias falla a medias, las primeras quedan aplicadas: arregla la base de datos a mano antes de volver a arrancar. Haz un solo cambio por migración.
:::

Para valores JSON usa `JSON`, para valores sí/no `BOOLEAN` (MySQL lo guarda como `TINYINT(1)`) y para números enteros por encima de 2^31 `BIGINT`. Más en [Base de datos y migraciones](/es/concepts/database/).

## Opciones de conexión

`MysqlDatabase.open(options)` recibe:

| Opción | Por defecto | Qué es |
|---|---|---|
| `url` | obligatoria | La URL de la base de datos |
| `migrations` | ninguna | La carpeta de migraciones del contexto |
| `connections` | `10` | Conexiones del pool |
| `waitTimeoutMs` | `30000` | Cuánto espera un guardado a un bloqueo |

newt se conecta con el cliente SQL de Bun (`Bun.SQL`), que es quien lee la URL. Su documentación explica qué más puede llevar la URL: https://bun.com/docs/runtime/sql

Para cambiar el tamaño del pool, edita `src/stores.ts`:

```ts title="src/stores.ts"
return MysqlDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations, connections: 20 })
```

:::note
Cada contexto tiene su propio pool. Tres contextos con el valor por defecto abren hasta 30 conexiones por instancia. Tenlas en cuenta frente al `max_connections` de tu servidor.
:::

## Tests en MySQL

Los tests de un backend con MySQL se ejecutan en memoria salvo que definas `TEST_DATABASE_URL`. Con ella, cada test crea su propia base de datos en ese servidor (con `utf8mb4_0900_bin`), ejecuta tus migraciones y la borra. Consulta [Testing](/es/guides/testing/#tests-de-módulo-en-postgres-o-mysql).

```sh
TEST_DATABASE_URL=mysql://root:root@localhost:3306/mysql bun test
```
