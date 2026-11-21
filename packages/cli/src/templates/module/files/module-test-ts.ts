import type { ContextNames } from '../../../names/context-names/context-names'
import type { ModuleNames }  from '../../../names/module-names/module-names'
import { fitting }           from '../../fitted-call/fitted-call'
import type { DatabaseKind } from '../../stores/store-databases'

/** On sqlite, the context's own migrations on a database in memory; on a server, src/test-database.ts's, real when TEST_DATABASE_URL is set. */
function databaseOf(database: DatabaseKind): { imports: string, migrations: boolean, open: string, drop: boolean } {
  if (database === 'sqlite') {
    return {
      imports: "import { join } from 'node:path'\nimport { SqliteDatabase } from '@newt-js/core/database/sqlite'",
      migrations: true,
      open: "await SqliteDatabase.open({\n    path: ':memory:',\n    migrations: MIGRATIONS,\n  })",
      drop: false,
    }
  }
  if (database === 'postgres' || database === 'mysql') {
    return { imports: "import { join } from 'node:path'\nimport { testDatabase } from '../../../../test-database'", migrations: true, open: 'await testDatabase(MIGRATIONS)', drop: true }
  }
  return { imports: "import { MemoryDatabase } from '@newt-js/core/database/memory'", migrations: false, open: 'new MemoryDatabase()', drop: false }
}

export function moduleTestTs(names: ModuleNames, context: ContextNames, database: DatabaseKind): string {
  const { folder, type, plural, words } = names
  const { path } = names
  const opened = databaseOf(database)
  return `import { afterEach, beforeEach, expect, test } from 'bun:test'
${opened.imports}
import { testContext, type TestContext } from '@newt-js/core/application/testing'
import { MemoryCluster } from '@newt-js/core/cluster/memory'
import { HttpRouter } from '@newt-js/core/http'
import { ${context.type}_Context } from '../../${context.folder}.context'
import type { ${type}_Module } from './${folder}.module'
${opened.migrations ? "\nconst MIGRATIONS = join(import.meta.dir, '../../migrations')" : ''}
const JSON_HEADERS = { 'content-type': 'application/json' }

let context: TestContext
let router: HttpRouter
let composed: ${context.type}_Context
let ${plural}: ${type}_Module
let signedIn: boolean
${opened.drop ? 'let dropDatabase: () => Promise<void>\n' : ''}
beforeEach(async () => {
  ${opened.drop ? `const { database, drop } = ${opened.open}\n  dropDatabase = drop` : `const database = ${opened.open}`}
  const cluster = new MemoryCluster()
  context = testContext({ name: '${context.folder}', cluster, database })
  router = new HttpRouter({ prefix: '/${context.folder}/api', database })
  signedIn = true
  router.authenticateWith(async () => signedIn ? { userId: 'tester' } : null)
  composed = ${context.type}_Context.initialize(context.base, router)
  ${plural} = composed['${names.module}']
})

${opened.drop ? 'afterEach(async () => {\n  await context.close()\n  await dropDatabase()\n})' : 'afterEach(() => context.close())'}

function call(method: string, path: string, body?: unknown) {
  const url = \`http://backend.test\${router.prefix}\${path}\`
  const init = body === undefined
    ? { method }
    : { method, headers: JSON_HEADERS, body: JSON.stringify(body) }
  return router.answer(new Request(url, init))
}

test('creates one and reads it back', async () => {
${fitting(`  const created = await ${plural}.create({ name: ' First ' })`, `  const created = await ${plural}.create({\n    name: ' First ',\n  })`)}

  const read = await ${plural}.get(created.id)
  expect(read).toMatchObject({ id: created.id, name: 'First' })
  const found = await ${plural}.find({ name: 'First' })
  expect(found).toMatchObject([{ id: created.id }])
  const page = await ${plural}.paginate({}, { size: 10 })
  expect(page).toMatchObject({ items: [{ id: created.id }], total: 1 })
})

test('keeps each one apart, and finds them by their name', async () => {
  const first = await ${plural}.create({ name: 'First' })
  const second = await ${plural}.create({ name: 'Second' })
  const another = await ${plural}.create({ name: 'First' })

  const read = await ${plural}.get(second.id)
  expect(read).toMatchObject({ id: second.id, name: 'Second' })
  const found = await ${plural}.find({ name: 'First' })
  const ids = found.map(each => each.id).sort()
  expect(ids).toEqual([first.id, another.id].sort())
${fitting(`  const page = await ${plural}.paginate({ name: 'Second' }, { size: 10 })`, `  const page = await ${plural}.paginate(\n    { name: 'Second' },\n    { size: 10 },\n  )`)}
  expect(page).toMatchObject({ items: [{ id: second.id }], total: 1 })
  const all = await ${plural}.paginate({}, { size: 10 })
  expect(all.total).toBe(3)
})

test('refuses a name it cannot keep', async () => {
  const created = ${plural}.create({ name: '  ' })
  await expect(created).rejects.toThrow()
})

test('has no ${words} with an unknown id', async () => {
  const unknown = \`/${path}/\${Bun.randomUUIDv7()}\`
  const response = await call('GET', unknown)
  expect(response?.status).toBe(404)
})

test.each([
  ['POST', '/${path}'],
  ['GET', '/${path}'],
  ['GET', \`/${path}/\${Bun.randomUUIDv7()}\`],
])('%s %s answers 401 to who has not signed in', async (method, path) => {
  signedIn = false
  const response = await call(method, path)
  expect(response?.status).toBe(401)
})

test('creates one by its route and reads it by another', async () => {
${fitting(`  const posted = await call('POST', '/${path}', { name: 'Second' })`, `  const posted = await call('POST', '/${path}', {\n    name: 'Second',\n  })`)}
  expect(posted?.status).toBe(201)
  const { id } = await posted!.json() as { id: string }

  const read = await call('GET', \`/${path}/\${id}\`)
  expect(await read?.json()).toMatchObject({ id, name: 'Second' })
  const listed = await call('GET', '/${path}')
  expect(await listed?.json()).toMatchObject({ items: [{ id }], total: 1 })
})
`
}
