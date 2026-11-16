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
  expect(backendStores(await backendWith(both))).rejects.toThrow('src/stores.ts imports SqliteDatabase and PostgresDatabase')
})

test('null without a stores.ts, or one that opens none of newt\'s', async () => {
  expect(await backendStores(await backendWith(null))).toBeNull()
  expect(await backendStores(await backendWith('openMine()'))).toBeNull()
})
