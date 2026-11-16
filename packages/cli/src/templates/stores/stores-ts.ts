import { STORE_DATABASES } from './store-databases'
import { STORE_FILES }     from './store-files'
import type { Stores }     from './stores'

const TEST_DATABASE = `  if (Bun.env.NODE_ENV === 'test') {
    const { MemoryDatabase } = await import('@newt-js/core/database/memory')
    return new MemoryDatabase()
  }
`

const TEST_FILES = `  if (Bun.env.NODE_ENV === 'test') {
    const { MemoryStorage } = await import('@newt-js/core/files/memory')
    return { private: new MemoryStorage() }
  }
`

/** Whether src/stores.ts reads a variable it requires, through src/env.ts. */
export const storesNeedEnv = ({ database, files }: Stores) => STORE_DATABASES[database].needsEnv || STORE_FILES[files].needsEnv

/** src/stores.ts: how each context opens its own database and its files, of the kinds the backend chose. */
export function storesTs(stores: Stores): string {
  const database = STORE_DATABASES[stores.database]
  const files = STORE_FILES[stores.files]
  const imports = [
    "import type { StorageOptions } from '@newt-js/core'",
    "import type { Database } from '@newt-js/core/application'",
    ...database.imports,
    ...files.imports,
    "import type { HttpRouter } from '@newt-js/core/http'",
    ...storesNeedEnv(stores) ? ["import { requiredEnv } from './env'"] : [],
  ]
  const envOf = database.usesEnvOf || files.usesEnvOf ? "const envOf = (context: string) => context.replaceAll('-', '_').toUpperCase()\n" : ''
  const constants = [files.constants, envOf].filter(Boolean).join('\n')
  return `${imports.join('\n')}
${constants ? `\n${constants}` : ''}
${database.inMemoryForTests ? 'export async function' : 'export function'} openDatabase(context: string, migrations: string): Promise<Database> {
${database.inMemoryForTests ? TEST_DATABASE : ''}  return ${database.open}
}

export async function openStorage(context: string, router: HttpRouter): Promise<StorageOptions> {
${files.inMemoryForTests ? TEST_FILES : ''}${files.body}
}
`
}
