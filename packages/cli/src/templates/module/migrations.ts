import type { ModuleNames }  from '../../names/module-names/module-names'
import type { DatabaseName } from '../context/databases'

type Migration = { up: string, down: string }

const COLUMNS = ['name', 'created_at', 'updated_at']

function migration(table: string, id: string, text: string, after = ''): Migration {
  const columns = COLUMNS.map(column => `  ${column} ${text} NOT NULL,`).join('\n')
  return {
    up: `CREATE TABLE ${table} (\n  id ${id} PRIMARY KEY,\n  version INTEGER NOT NULL,\n${columns.slice(0, -1)}\n)${after};\n`,
    down: `DROP TABLE ${table};\n`,
  }
}

/** The table of a module's entity, in the SQL of its context's database; none for a database in memory. */
export function moduleMigration({ table }: ModuleNames, database: DatabaseName): Migration | null {
  switch (database) {
    case 'sqlite': return migration(`"${table}"`, 'TEXT', 'TEXT')
    case 'postgres': return migration(`"${table}"`, 'TEXT COLLATE "C"', 'TEXT COLLATE "C"')
    case 'mysql': return migration(`\`${table}\``, 'VARCHAR(64) COLLATE utf8mb4_0900_bin', 'VARCHAR(255) COLLATE utf8mb4_0900_bin', ' CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin')
    case 'memory': return null
  }
}
