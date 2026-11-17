---
title: SQLite
description: La base de datos por defecto de newt, un fichero por contexto, lista para producción.
sidebar:
  order: 1
---

SQLite es una base de datos guardada en un solo fichero en tu disco, sin servidor que mantener. Es la opción por defecto de newt porque no necesita preparación, y sirve para producción: un fichero SQLite atiende una aplicación con mucho uso en una sola máquina.

## Crear un backend con SQLite

SQLite es la opción por defecto, así que estos dos comandos hacen lo mismo:

```sh
newt init newthub
newt init newthub --db sqlite
```

Cada contexto obtiene su propio fichero al arrancar el backend. No hay nada que crear ni instalar.

## Dónde están los ficheros

Cada contexto tiene un fichero de base de datos, en `data/` por defecto:

| Contexto | Fichero | Variable |
|---|---|---|
| `tasks` | `data/tasks.sqlite` | `TASKS_DATABASE` |
| `chat` | `data/chat.sqlite` | `CHAT_DATABASE` |

La variable es el nombre de la carpeta del contexto en mayúsculas, con `-` cambiado por `_`, más `_DATABASE`. `newt add context` la escribe en `.env` y en `.env.example`:

```sh title=".env"
TASKS_DATABASE=data/tasks.sqlite
```

`src/stores.ts` la lee, y usa `data/<context>.sqlite` si no está definida:

```ts title="src/stores.ts"
export async function openDatabase(
  context: string,
  migrations: string,
  stores: Stores,
): Promise<Database> {
  if (stores === 'memory') {
    return SqliteDatabase.open({ path: ':memory:', migrations })
  }
  return SqliteDatabase.open({
    path:
      Bun.env[`${envOf(context)}_DATABASE`] ?? `data/${context}.sqlite`,
    migrations,
  })
}
```

- Una ruta relativa parte de la carpeta desde la que arrancas el backend.
- newt crea la carpeta del fichero si no existe.
- Junto a cada fichero, SQLite guarda otros dos: `tasks.sqlite-wal` y `tasks.sqlite-shm`. Forman parte de la base de datos.
- `data/` está en `.gitignore`: tus datos nunca entran en git.

:::danger
Nunca borres el fichero `-wal` de una base de datos en uso. Puede contener los últimos cambios guardados que aún no están en el fichero principal.
:::

## Qué configura newt en cada fichero

Al abrir un fichero, newt fija estas opciones de SQLite (*pragmas*):

| Pragma | Valor | Por qué |
|---|---|---|
| `journal_mode` | `WAL` | Las lecturas no esperan a las escrituras |
| `synchronous` | `NORMAL` | Escrituras rápidas, seguras con WAL |
| `foreign_keys` | `ON` | Se respeta `REFERENCES` en tus migraciones |
| `busy_timeout` | `5000` | Espera hasta 5 s a que se libere un bloqueo |

newt abre además dos conexiones por fichero: una que escribe y otra, de solo lectura, que lee fuera de las transacciones. Dentro de un backend, las transacciones sobre un fichero van por turnos: escribe una cada vez.

## Opciones de SqliteDatabase

`SqliteDatabase.open(options)` recibe:

| Opción | Por defecto | Qué es |
|---|---|---|
| `path` | obligatoria | El fichero, o `':memory:'` |
| `migrations` | ninguna | La carpeta de migraciones del contexto |
| `waitTimeoutMs` | `30000` | Cuánto espera una transacción su turno |

`open` ejecuta las [migraciones](/es/concepts/database/) pendientes antes de devolver la base de datos. `':memory:'` es lo que usan los tests: una base de datos nueva y vacía que se borra al cerrarla.

## Copia de seguridad en caliente

Copiar `tasks.sqlite` con `cp` mientras el backend funciona puede darte una copia rota: los cambios recientes pueden estar aún en el fichero `-wal`. Usa la copia de seguridad del propio SQLite. Es segura con el backend en marcha.

1. Haz una copia coherente con `VACUUM INTO`, desde un pequeño script de Bun:

   ```ts title="scripts/backup.ts"
   import { Database } from 'bun:sqlite'

   const stamp = new Date().toISOString().replaceAll(':', '-')
   const database = new Database('data/tasks.sqlite')
   database.run(`VACUUM INTO 'backups/tasks-${stamp}.sqlite'`)
   database.close()
   ```

   ```sh
   mkdir -p backups && bun scripts/backup.ts
   ```

   Con la herramienta de línea de comandos `sqlite3`, `.backup` hace lo mismo:

   ```sh
   sqlite3 data/tasks.sqlite ".backup 'backups/tasks.sqlite'"
   ```

2. Copia el fichero de la copia de seguridad a otro sitio: otro disco, otro ordenador o un almacenamiento de objetos.
3. Prográmalo, por ejemplo una vez al día con cron.

Para restaurar, para el backend, pon la copia en lugar de `data/tasks.sqlite`, borra los ficheros `-wal` y `-shm` antiguos y vuelve a arrancar el backend.

:::tip
Haz copia del fichero de cada contexto, y de la carpeta de ficheros (`data/files/`) si guardas las subidas en el disco local. Una copia que nunca has restaurado no es una copia: prueba a restaurar una vez.
:::

Para copias continuas existen herramientas que envían el WAL de SQLite a un almacenamiento de objetos, como Litestream (https://litestream.io). newt no las necesita ni las configura.

## Cuándo pasar a Postgres o MySQL

SQLite es la opción adecuada mientras tu backend funcione como un solo proceso en una sola máquina. Pasa un contexto a [Postgres](/es/guides/databases/postgres/) o [MySQL](/es/guides/databases/mysql/) cuando:

- Quieras [varias instancias](/es/guides/scaling/) del backend en máquinas distintas. Tienen que compartir base de datos, y un fichero SQLite vive en un solo disco.
- Tu proveedor no tenga disco persistente, y el fichero se perdería en cada despliegue.
- Tu equipo ya tenga un Postgres o un MySQL gestionado, con sus copias de seguridad.

Mucho tráfico, por sí solo, rara vez es motivo: una máquina con SQLite atiende muchas lecturas, y las escrituras se turnan rápido. [Cambiar de base de datos](/es/guides/databases/switching/) explica qué cambia.

:::note
newt hace que las escrituras se turnen solo dentro de un proceso. Entre procesos se aplican el bloqueo del propio SQLite y el `busy_timeout` de 5 s. Para instancias en más de una máquina, usa un servidor de base de datos.
:::
