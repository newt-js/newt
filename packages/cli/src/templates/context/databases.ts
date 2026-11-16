import type { ContextNames } from '../../names/context-names/context-names'

export type DatabaseTemplate = {
  imports: string[]
  open: (names: ContextNames) => string
  migrations: boolean
  env: (names: ContextNames) => Record<string, string>
  testEnv: (names: ContextNames) => Record<string, string>
  needsServer: boolean
}

const MIGRATIONS = "join(import.meta.dir, 'migrations')"

export const DATABASES = {
  sqlite: {
    imports: ["import { join } from 'node:path'", "import { SqliteDatabase } from '@newt-js/core/database/sqlite'"],
    open: ({ env, folder }) => `await SqliteDatabase.open({ path: Bun.env.${env}_DATABASE ?? 'data/${folder}.sqlite', migrations: ${MIGRATIONS} })`,
    migrations: true,
    env: ({ env, folder }) => ({ [`${env}_DATABASE`]: `data/${folder}.sqlite` }),
    testEnv: ({ env }) => ({ [`${env}_DATABASE`]: ':memory:' }),
    needsServer: false,
  },
  postgres: {
    imports: ["import { join } from 'node:path'", "import { PostgresDatabase } from '@newt-js/core/database/postgres'", "import { requiredEnv } from '../../env'"],
    open: ({ env }) => `await PostgresDatabase.open({ url: requiredEnv('${env}_DATABASE_URL'), migrations: ${MIGRATIONS} })`,
    migrations: true,
    env: ({ env, folder }) => ({ [`${env}_DATABASE_URL`]: `postgres://postgres:postgres@localhost:5432/${folder.replaceAll('-', '_')}` }),
    testEnv: () => ({}),
    needsServer: true,
  },
  mysql: {
    imports: ["import { join } from 'node:path'", "import { MysqlDatabase } from '@newt-js/core/database/mysql'", "import { requiredEnv } from '../../env'"],
    open: ({ env }) => `await MysqlDatabase.open({ url: requiredEnv('${env}_DATABASE_URL'), migrations: ${MIGRATIONS} })`,
    migrations: true,
    env: ({ env, folder }) => ({ [`${env}_DATABASE_URL`]: `mysql://root:root@localhost:3306/${folder.replaceAll('-', '_')}` }),
    testEnv: () => ({}),
    needsServer: true,
  },
  memory: {
    imports: ["import { MemoryDatabase } from '@newt-js/core/database/memory'"],
    open: () => 'new MemoryDatabase()',
    migrations: false,
    env: () => ({}),
    testEnv: () => ({}),
    needsServer: false,
  },
} satisfies Record<string, DatabaseTemplate>

export type DatabaseName = keyof typeof DATABASES
