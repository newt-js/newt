import { STORE_DATABASES } from './store-databases'
import { STORE_FILES }     from './store-files'
import type { Stores }     from './stores'

/** Whether src/stores.ts reads a variable it requires, through src/env.ts. */
export const storesNeedEnv = ({ database, files }: Stores) => STORE_DATABASES[database].needsEnv || STORE_FILES[files].needsEnv

/** src/stores.ts: how each context opens its own database and its files, those configured or, for the tests, in memory. */
export function storesTs(stores: Stores): string {
  const database = STORE_DATABASES[stores.database]
  const files = STORE_FILES[stores.files]
  const imports = [
    "import type { StorageOptions } from '@newt-js/core'",
    "import type { Database } from '@newt-js/core/application'",
    ...database.memoryImports,
    ...database.imports,
    ...files.memoryImports,
    ...files.imports,
    "import type { HttpRouter } from '@newt-js/core/http'",
    ...storesNeedEnv(stores) ? ["import { requiredEnv } from './env'"] : [],
  ]
  const envOf = database.usesEnvOf || files.usesEnvOf ? "const envOf = (context: string) => context.replaceAll('-', '_').toUpperCase()\n" : ''
  const constants = [files.constants, envOf].filter(Boolean).join('\n')
  const databaseInMemory = stores.database === 'memory' ? '' : `  if (stores === 'memory') {\n    return ${database.inMemory}\n  }\n`
  const filesInMemory = stores.files === 'memory' ? '' : `  if (stores === 'memory') {\n    return { private: ${files.inMemory} }\n  }\n`
  return `${imports.join('\n')}

/** The stores a backend opens: those configured, or new ones in memory, as its tests want. */
export type Stores = 'configured' | 'memory'
${constants ? `\n${constants}` : ''}
export async function openDatabase(context: string, migrations: string, stores: Stores): Promise<Database> {
${databaseInMemory}  return ${database.open}
}

export async function openStorage(context: string, router: HttpRouter, stores: Stores, host: string | undefined): Promise<StorageOptions> {
${filesInMemory}${files.body}
}
`
}
