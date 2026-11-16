/** A context's variables, from its env prefix, its folder and its backend's package name. */
type ContextVariables = (env: string, folder: string, backend: string) => Record<string, string>

const none: ContextVariables = () => ({})

/** A context's database, `<backend>__<context>`: the two apart by a mark neither name holds, so two backends never share one. */
export const databaseName = (backend: string, folder: string) => [backend, folder].map(name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')).join('__')

/** `inMemory`: what the tests open in its place; `memoryImports`, what that needs. */
export type StoreDatabase = { imports: string[], open: string, inMemory: string, memoryImports: string[], usesEnvOf: boolean, needsEnv: boolean, className: string, contextEnv: ContextVariables }

export const STORE_DATABASES = {
  sqlite: {
    imports: ["import { SqliteDatabase } from '@newt-js/core/database/sqlite'"],
    inMemory: "SqliteDatabase.open({ path: ':memory:', migrations })",
    memoryImports: [],
    open: 'SqliteDatabase.open({ path: Bun.env[`${envOf(context)}_DATABASE`] ?? `data/${context}.sqlite`, migrations })',
    usesEnvOf: true,
    needsEnv: false,
    className: 'SqliteDatabase',
    contextEnv: (env, folder) => ({ [`${env}_DATABASE`]: `data/${folder}.sqlite` }),
  },
  postgres: {
    imports: ["import { PostgresDatabase } from '@newt-js/core/database/postgres'"],
    inMemory: 'new MemoryDatabase()',
    memoryImports: ["import { MemoryDatabase } from '@newt-js/core/database/memory'"],
    open: 'PostgresDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })',
    usesEnvOf: true,
    needsEnv: true,
    className: 'PostgresDatabase',
    contextEnv: (env, folder, backend) => ({ [`${env}_DATABASE_URL`]: `postgres://postgres:postgres@localhost:5432/${databaseName(backend, folder)}` }),
  },
  mysql: {
    imports: ["import { MysqlDatabase } from '@newt-js/core/database/mysql'"],
    inMemory: 'new MemoryDatabase()',
    memoryImports: ["import { MemoryDatabase } from '@newt-js/core/database/memory'"],
    open: 'MysqlDatabase.open({ url: requiredEnv(`${envOf(context)}_DATABASE_URL`), migrations })',
    usesEnvOf: true,
    needsEnv: true,
    className: 'MysqlDatabase',
    contextEnv: (env, folder, backend) => ({ [`${env}_DATABASE_URL`]: `mysql://root:root@localhost:3306/${databaseName(backend, folder)}` }),
  },
  memory: {
    imports: ["import { MemoryDatabase } from '@newt-js/core/database/memory'"],
    inMemory: 'new MemoryDatabase()',
    memoryImports: [],
    open: 'new MemoryDatabase()',
    usesEnvOf: false,
    needsEnv: false,
    className: 'MemoryDatabase',
    contextEnv: none,
  },
} satisfies Record<string, StoreDatabase>

export type DatabaseKind = keyof typeof STORE_DATABASES
