/** A context's variables, from its env prefix, its folder and its backend's package name. */
type ContextVariables = (env: string, folder: string, backend: string) => Record<string, string>

const none: ContextVariables = () => ({})

/** A context's database, `<backend>__<context>`: the two apart by a mark neither name holds, so two backends never share one. */
export const databaseName = (backend: string, folder: string) => [backend, folder].map(name => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')).join('__')

/** A context's database: the adapter of core its <context>.context.ts opens, `sqlite()`, and its variables in .env. */
export type StoreDatabase = { adapter: string, from: string, needsEnv: boolean, contextEnv: ContextVariables }

export const STORE_DATABASES = {
  sqlite: {
    adapter: 'sqlite',
    from: '@newt-js/core/database/sqlite',
    needsEnv: false,
    contextEnv: (env, folder) => ({ [`${env}_DATABASE`]: `data/${folder}.sqlite` }),
  },
  postgres: {
    adapter: 'postgres',
    from: '@newt-js/core/database/postgres',
    needsEnv: true,
    contextEnv: (env, folder, backend) => ({ [`${env}_DATABASE_URL`]: `postgres://postgres:postgres@localhost:5432/${databaseName(backend, folder)}` }),
  },
  mysql: {
    adapter: 'mysql',
    from: '@newt-js/core/database/mysql',
    needsEnv: true,
    contextEnv: (env, folder, backend) => ({ [`${env}_DATABASE_URL`]: `mysql://root:root@localhost:3306/${databaseName(backend, folder)}` }),
  },
  memory: {
    adapter: 'memoryDatabase',
    from: '@newt-js/core/database/memory',
    needsEnv: false,
    contextEnv: none,
  },
} satisfies Record<string, StoreDatabase>

export type DatabaseKind = keyof typeof STORE_DATABASES
