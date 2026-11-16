/** A context's variables, from its env prefix, its folder and its backend's package name. */
type ContextVariables = (env: string, folder: string, backend: string) => Record<string, string>

const none: ContextVariables = () => ({})

const databaseName = (backend: string, folder: string) => `${backend}_${folder}`.toLowerCase().replace(/[^a-z0-9_]+/g, '_')

export type StoreDatabase = { imports: string[], open: string, inMemoryForTests: boolean, usesEnvOf: boolean, needsEnv: boolean, className: string, contextEnv: ContextVariables, contextTestEnv: ContextVariables }

export const STORE_DATABASES = {
  sqlite: {
    imports: ["import { SqliteDatabase } from '@newt-js/core/database/sqlite'"],
    inMemoryForTests: false,
    open: 'SqliteDatabase.open({ path: Bun.env[`${envOf(context)}_DATABASE`] ?? `data/${context}.sqlite`, migrations })',
    usesEnvOf: true,
    needsEnv: false,
    className: 'SqliteDatabase',
    contextEnv: (env, folder) => ({ [`${env}_DATABASE`]: `data/${folder}.sqlite` }),
    contextTestEnv: env => ({ [`${env}_DATABASE`]: ':memory:' }),
  },
  postgres: {
    imports: ["import { PostgresDatabase } from '@newt-js/core/database/postgres'"],
    inMemoryForTests: true,
    open: 'PostgresDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })',
    usesEnvOf: true,
    needsEnv: true,
    className: 'PostgresDatabase',
    contextEnv: (env, folder, backend) => ({ [`${env}_DATABASE_URL`]: `postgres://postgres:postgres@localhost:5432/${databaseName(backend, folder)}` }),
    contextTestEnv: none,
  },
  mysql: {
    imports: ["import { MysqlDatabase } from '@newt-js/core/database/mysql'"],
    inMemoryForTests: true,
    open: 'MysqlDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })',
    usesEnvOf: true,
    needsEnv: true,
    className: 'MysqlDatabase',
    contextEnv: (env, folder, backend) => ({ [`${env}_DATABASE_URL`]: `mysql://root:root@localhost:3306/${databaseName(backend, folder)}` }),
    contextTestEnv: none,
  },
  memory: {
    imports: ["import { MemoryDatabase } from '@newt-js/core/database/memory'"],
    inMemoryForTests: false,
    open: 'Promise.resolve(new MemoryDatabase())',
    usesEnvOf: false,
    needsEnv: false,
    className: 'MemoryDatabase',
    contextEnv: none,
    contextTestEnv: none,
  },
} satisfies Record<string, StoreDatabase>

export type DatabaseKind = keyof typeof STORE_DATABASES
