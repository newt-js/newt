---
title: Cambiar de base de datos
description: Pasa un backend de SQLite a Postgres o MySQL, y llévate sus datos.
sidebar:
  order: 4
---

Cambiar de base de datos consiste en cambiar qué servidor de base de datos abren tus contextos, reescribir sus migraciones en el SQL de esa base de datos y copiar los datos. newt hace la primera parte por ti al crear un proyecto; en uno que ya existe la haces a mano, con un proyecto recién generado como modelo.

## Qué hace newt y qué no

| Paso | Quién lo hace |
|---|---|
| Escribir `src/stores.ts` para la nueva base de datos | Tú, copiándolo de un proyecto nuevo |
| Reescribir las migraciones en el nuevo SQL | Tú |
| Crear las nuevas bases de datos | Tú |
| Crear las tablas en las nuevas bases de datos | newt, al arrancar el backend |
| Copiar las filas | Tú, con un script |

No hay ningún comando de `newt` que cambie la base de datos de un backend ni que mueva datos.

:::caution
La línea de comandos de newt lee `src/stores.ts` para saber en qué SQL escribir las migraciones nuevas. Debe importar un solo tipo de base de datos (más la de memoria). Puedes montar a mano un backend con unos contextos en SQLite y otros en Postgres, pero entonces los comandos `newt add` se detienen con "newt cannot tell which database the backend uses". Cambia el backend entero de una vez.
:::

## 1. Genera un proyecto modelo

En una carpeta aparte, crea un proyecto vacío con la base de datos que quieres y los mismos contextos:

```sh
newt init newthub-model --db postgres
cd newthub-model
newt add context tasks
```

Usa `--db mysql` para MySQL. En los siguientes pasos copias ficheros de este proyecto; luego lo borras.

## 2. Cambia src/stores.ts

Sustituye `openDatabase` y sus imports por los del modelo. De SQLite a Postgres:

```ts title="src/stores.ts"
import { MemoryDatabase } from '@newt-js/core/database/memory'
import { PostgresDatabase } from '@newt-js/core/database/postgres'
import { requiredEnv } from './env'

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

Quita el import de `SqliteDatabase`. Deja `openStorage` como está: los ficheros no cambian. Si tu proyecto no tiene `src/env.ts` (donde está `requiredEnv`), cópialo también del modelo.

## 3. Cambia el entorno

La variable de cada contexto pasa de ser la ruta de un fichero a ser una URL:

| Antes (SQLite) | Después (Postgres) |
|---|---|
| `TASKS_DATABASE=data/databases/tasks/tasks.sqlite` | `TASKS_DATABASE_URL=postgres://...` |

Actualiza `.env`, `.env.example` y la configuración de producción. Después crea una base de datos por contexto, como explican [Postgres](/es/guides/databases/postgres/#crear-las-bases-de-datos) o [MySQL](/es/guides/databases/mysql/#crear-las-bases-de-datos).

## 4. Reescribe las migraciones

Las nuevas bases de datos empiezan vacías, así que puedes reescribir cada fichero de migración en su sitio, en el nuevo SQL. Mantén los nombres y los números de los ficheros.

La tabla `task`, comparada:

| Columna | SQLite | Postgres | MySQL |
|---|---|---|---|
| `id` | `TEXT` | `TEXT COLLATE "C"` | `VARCHAR(64) COLLATE utf8mb4_0900_bin` |
| `version` | `INTEGER` | `INTEGER` | `INTEGER` |
| `name` | `TEXT` | `TEXT COLLATE "C"` | `VARCHAR(255) COLLATE utf8mb4_0900_bin` |

Otras diferencias a vigilar:

- Texto: en Postgres, añade `COLLATE "C"` a cada columna de texto. En MySQL, usa `VARCHAR(n) COLLATE utf8mb4_0900_bin` y termina la tabla con `CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin`. newt se niega a arrancar con columnas de texto que ordenarían distinto.
- Sí/no: SQLite `BOOLEAN` (guardado como 0 o 1), Postgres `boolean`, MySQL `BOOLEAN` (`TINYINT(1)`).
- JSON: en SQLite un tipo que empiece por `JSON`, en Postgres `jsonb`, en MySQL `JSON`.
- Números enteros grandes: en SQLite caben en `INTEGER`; usa `bigint` en Postgres y `BIGINT` en MySQL.
- Comillas: SQLite y Postgres entrecomillan los nombres con `"task"`, MySQL con comillas invertidas.
- `ALTER TABLE` cambia mucho entre las tres. Revisa cada `ALTER` con el manual de la nueva base de datos.

:::tip
Para ver el SQL exacto que escribe newt para un módulo, ejecuta `newt add module tasks/task` en el proyecto modelo y abre su carpeta `migrations/`.
:::

## 5. Cambia los tests

Los tests de módulo escritos en SQLite abren `SqliteDatabase` con `':memory:'`, que ahora ejecutaría SQL de Postgres en SQLite. Cámbialos a la forma del modelo:

1. Copia `src/test-database.ts` del proyecto modelo.
2. En cada `<module>.module.test.ts`, abre la base de datos con `testDatabase` y bórrala después de cada test:

   ```ts title="src/contexts/tasks/modules/task/task.module.test.ts"
   import { testDatabase } from '../../../../test-database'

   let dropDatabase: () => Promise<void>

   beforeEach(async () => {
     const { database, drop } = await testDatabase(
       join(import.meta.dir, '../../migrations'),
     )
     dropDatabase = drop
     context = testContext({
       name: 'tasks',
       cluster: new MemoryCluster(),
       database,
     })
     // ...
   })

   afterEach(async () => {
     await context.close()
     await dropDatabase()
   })
   ```

3. Ejecuta los tests contra un servidor real, para que corran las nuevas migraciones:

   ```sh
   TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
     bun test
   ```

Más en [Testing](/es/guides/testing/#tests-de-módulo-en-postgres-o-mysql).

## 6. Mueve los datos

newt no copia datos entre bases de datos. Lo hace un script corto de Bun, tabla a tabla.

1. Deja que el backend termine sus jobs pendientes y páralo. Nada debe escribir en el fichero SQLite mientras copias.
2. Arranca el backend una vez con la nueva base de datos y páralo. Así se crean las tablas.
3. Copia las filas de tus tablas con un script como este:

   ```ts title="scripts/copy-tasks.ts"
   import { Database } from 'bun:sqlite'
   import { SQL } from 'bun'

   const tables = ['project', 'task']
   const from = new Database('data/databases/tasks/tasks.sqlite', { readonly: true })
   const to = new SQL(Bun.env.TASKS_DATABASE_URL!)

   for (const table of tables) {
     const rows = from
       .query(`SELECT * FROM "${table}"`)
       .all() as Record<string, unknown>[]
     for (const row of rows) {
       await to`INSERT INTO ${to(table)} ${to(row)}`
     }
     console.log(`${table}: ${rows.length} rows`)
   }

   from.close()
   await to.close()
   ```

   ```sh
   bun scripts/copy-tasks.ts
   ```

4. Repite con cada contexto, con su fichero y su URL.
5. Arranca el backend y revisa tus datos.

Sobre el script:

- Los nombres de las columnas son los mismos en todas las bases de datos, así que las filas se copian tal cual.
- SQLite devuelve las columnas sí/no como `0` o `1`. Si una tabla las tiene, conviértelas en `true` o `false` antes de insertarlas en Postgres.
- Ordena las tablas respetando los `REFERENCES`: un proyecto antes que las tareas que apuntan a él.
- No copies las tablas propias de newt (`newt_migrations`, `newt_framework_migrations`, `newt_job`, `newt_job_queue`, `newt_schedule_tick`, `newt_idempotency_key`). La nueva base de datos tiene las suyas y el backend las vuelve a llenar.

:::danger
Guarda los ficheros SQLite hasta haber revisado la nueva base de datos. Son tu camino de vuelta.
:::

## En el otro sentido

Pasar de Postgres o MySQL a SQLite es lo mismo al revés: `SqliteDatabase` en `src/stores.ts`, rutas de fichero `<CONTEXT>_DATABASE` en `.env`, migraciones en el SQL de SQLite y tests de módulo con `SqliteDatabase.open({ path: ':memory:', migrations })`, como muestra [SQLite](/es/guides/databases/sqlite/). Borra `src/test-database.ts`.
