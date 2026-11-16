type ContextVariables = (env: string, folder: string) => Record<string, string>

const none: ContextVariables = () => ({})

export type StoreDatabase = { imports: string[], open: string, usesEnvOf: boolean, needsEnv: boolean, className: string, contextEnv: ContextVariables, contextTestEnv: ContextVariables }

export const STORE_DATABASES = {
  sqlite: {
    imports: ["import { SqliteDatabase } from '@newt-js/core/database/sqlite'"],
    open: 'SqliteDatabase.open({ path: Bun.env[`${envOf(context)}_DATABASE`] ?? `data/${context}.sqlite`, migrations })',
    usesEnvOf: true,
    needsEnv: false,
    className: 'SqliteDatabase',
    contextEnv: (env, folder) => ({ [`${env}_DATABASE`]: `data/${folder}.sqlite` }),
    contextTestEnv: env => ({ [`${env}_DATABASE`]: ':memory:' }),
  },
  postgres: {
    imports: ["import { PostgresDatabase } from '@newt-js/core/database/postgres'"],
    open: 'PostgresDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })',
    usesEnvOf: true,
    needsEnv: true,
    className: 'PostgresDatabase',
    contextEnv: (env, folder) => ({ [`${env}_DATABASE_URL`]: `postgres://postgres:postgres@localhost:5432/${folder.replaceAll('-', '_')}` }),
    contextTestEnv: none,
  },
  mysql: {
    imports: ["import { MysqlDatabase } from '@newt-js/core/database/mysql'"],
    open: 'MysqlDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })',
    usesEnvOf: true,
    needsEnv: true,
    className: 'MysqlDatabase',
    contextEnv: (env, folder) => ({ [`${env}_DATABASE_URL`]: `mysql://root:root@localhost:3306/${folder.replaceAll('-', '_')}` }),
    contextTestEnv: none,
  },
  memory: {
    imports: ["import { MemoryDatabase } from '@newt-js/core/database/memory'"],
    open: 'Promise.resolve(new MemoryDatabase())',
    usesEnvOf: false,
    needsEnv: false,
    className: 'MemoryDatabase',
    contextEnv: none,
    contextTestEnv: none,
  },
} satisfies Record<string, StoreDatabase>

export type DatabaseKind = keyof typeof STORE_DATABASES
