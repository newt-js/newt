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

test('the kinds its stores.ts opens', async () => {
  expect(await backendStores(await backendWith('PostgresDatabase.open() … S3Storage.open()'))).toEqual({ database: 'postgres', files: 's3' })
})

test('null without a stores.ts, or one that opens none of newt\'s', async () => {
  expect(await backendStores(await backendWith(null))).toBeNull()
  expect(await backendStores(await backendWith('openMine()'))).toBeNull()
})
