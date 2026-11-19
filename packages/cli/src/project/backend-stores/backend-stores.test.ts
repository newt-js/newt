import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdtemp }         from 'node:fs/promises'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { backendStores }   from './backend-stores'
import { contextDatabase } from './backend-stores'

async function backendWith(files: Record<string, string>): Promise<string> {
  const backend = await mkdtemp(join(tmpdir(), 'newt-cli-stores-'))
  for (const [path, content] of Object.entries(files)) await Bun.write(join(backend, path), content)
  return backend
}

test("the kinds a new context gets: its package.json's newt, as newt init wrote it", async () => {
  expect(await backendStores(await backendWith({ 'package.json': JSON.stringify({ newt: { database: 'postgres', files: 's3' } }) }))).toEqual({ database: 'postgres', files: 's3' })
})

test("each undefined without them, or with one that is none of newt's", async () => {
  expect(await backendStores(await backendWith({}))).toEqual({ database: undefined, files: undefined })
  expect(await backendStores(await backendWith({ 'package.json': JSON.stringify({ newt: { database: 'mongo' } }) }))).toEqual({ database: undefined, files: undefined })
  expect(await backendStores(await backendWith({ 'package.json': '{ nope' }))).toEqual({ database: undefined, files: undefined })
})

const CONTEXT = 'src/contexts/sales/sales.context.ts'

test('the database a context opens: the adapter its context file imports, whatever its comments name', async () => {
  const code = "import { postgres } from '@newt-js/core/database/postgres'\n// moved off sqlite() in 2026\n"
  expect(await contextDatabase(await backendWith({ [CONTEXT]: code }), 'sales')).toBe('postgres')
})

test('none without one of newt\'s, or with an import of a type alone; and refuses two', async () => {
  expect(await contextDatabase(await backendWith({}), 'sales')).toBeUndefined()
  expect(await contextDatabase(await backendWith({ [CONTEXT]: "import type { sqlite } from '@newt-js/core/database/sqlite'\n" }), 'sales')).toBeUndefined()
  const both = "import { postgres } from '@newt-js/core/database/postgres'\nimport { sqlite } from '@newt-js/core/database/sqlite'\n"
  await expect(contextDatabase(await backendWith({ [CONTEXT]: both }), 'sales')).rejects.toThrow('src/contexts/sales/sales.context.ts imports sqlite() and postgres()')
})
