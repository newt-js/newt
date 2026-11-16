import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { mkdtemp }       from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
// --------------------------------------------------------
import { backendStores } from './backend-stores'

async function backendWith(stores: string | null): Promise<string> {
  const backend = await mkdtemp(join(tmpdir(), 'newt-cli-stores-'))
  if (stores !== null) await Bun.write(join(backend, 'src/stores.ts'), stores)
  return backend
}

const IMPORTS = "import { PostgresDatabase } from '@newt-js/core/database/postgres'\nimport { S3Storage } from '@newt-js/core/files/s3'\n"

test('the kinds its stores.ts imports, whatever its comments name', async () => {
  expect(await backendStores(await backendWith(`${IMPORTS}// moved off SqliteDatabase in 2026\n`))).toEqual({ database: 'postgres', files: 's3' })
})

test('refuses a stores.ts that imports two databases', async () => {
  const both = `${IMPORTS}import { SqliteDatabase } from '@newt-js/core/database/sqlite'\n`
  await expect(backendStores(await backendWith(both))).rejects.toThrow('src/stores.ts imports SqliteDatabase and PostgresDatabase')
})

test('each undefined without a stores.ts, or one that opens none of newt\'s', async () => {
  expect(await backendStores(await backendWith(null))).toEqual({ database: undefined, files: undefined })
  expect(await backendStores(await backendWith('openMine()'))).toEqual({ database: undefined, files: undefined })
})

test('the database apart from the files, and no import of a type alone', async () => {
  const mine = "import { SqliteDatabase } from '@newt-js/core/database/sqlite'\nimport { MyStorage } from './my-storage'\nimport type { PostgresDatabase } from '@newt-js/core/database/postgres'\n"
  expect(await backendStores(await backendWith(mine))).toEqual({ database: 'sqlite', files: undefined })
})
