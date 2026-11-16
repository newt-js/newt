export type StoreDatabase = { imports: string[], open: string, usesEnvOf: boolean, needsEnv: boolean }

export const STORE_DATABASES = {
  sqlite: {
    imports: ["import { SqliteDatabase } from '@newt-js/core/database/sqlite'"],
    open: 'SqliteDatabase.open({ path: Bun.env[`${envOf(context)}_DATABASE`] ?? `data/${context}.sqlite`, migrations })',
    usesEnvOf: true,
    needsEnv: false,
  },
  postgres: {
    imports: ["import { PostgresDatabase } from '@newt-js/core/database/postgres'"],
    open: 'PostgresDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })',
    usesEnvOf: true,
    needsEnv: true,
  },
  mysql: {
    imports: ["import { MysqlDatabase } from '@newt-js/core/database/mysql'"],
    open: 'MysqlDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })',
    usesEnvOf: true,
    needsEnv: true,
  },
  memory: {
    imports: ["import { MemoryDatabase } from '@newt-js/core/database/memory'"],
    open: 'Promise.resolve(new MemoryDatabase())',
    usesEnvOf: false,
    needsEnv: false,
  },
} satisfies Record<string, StoreDatabase>

export type DatabaseKind = keyof typeof STORE_DATABASES
