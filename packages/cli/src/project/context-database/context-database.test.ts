import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdtemp }         from 'node:fs/promises'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { contextDatabase } from './context-database'

async function backendWith(context: string, code: string): Promise<string> {
  const backend = await mkdtemp(join(tmpdir(), 'newt-cli-context-db-'))
  await Bun.write(join(backend, `src/contexts/${context}/${context}.context.ts`), code)
  return backend
}

test("the database its context's file opens", async () => {
  expect(await contextDatabase(await backendWith('sales', 'await PostgresDatabase.open({})'), 'sales')).toBe('postgres')
  expect(await contextDatabase(await backendWith('sales', 'new MemoryDatabase()'), 'sales')).toBe('memory')
})

test('null when it opens none of newt\'s', async () => {
  expect(await contextDatabase(await backendWith('sales', 'openMine()'), 'sales')).toBeNull()
})
