import type { ContextNames } from '../../../names/context-names/context-names'
import type { ModuleNames }  from '../../../names/module-names/module-names'
import { withArticle }       from '../../../names/with-article/with-article'
import type { DatabaseKind } from '../../stores/store-databases'

/** On sqlite, the module's test runs the context's own migrations on a database in memory. */
function databaseOf(database: DatabaseKind): { imports: string, open: string } {
  if (database === 'sqlite') {
    return {
      imports: "import { join } from 'node:path'\nimport { SqliteDatabase } from '@newt-js/core/database/sqlite'",
      open: "await SqliteDatabase.open({ path: ':memory:', migrations: join(import.meta.dir, '../../migrations') })",
    }
  }
  return { imports: "import { MemoryDatabase } from '@newt-js/core/database/memory'", open: 'new MemoryDatabase()' }
}

export function moduleTestTs(names: ModuleNames, context: ContextNames, database: DatabaseKind): string {
  const { folder, type, plural, words } = names
  const path = `${context.folder}/${names.path}`
  const opened = databaseOf(database)
  return `import { afterEach, beforeEach, expect, test } from 'bun:test'
${opened.imports}
import { testContext, type TestContext } from '@newt-js/core/application/testing'
import { MemoryCluster } from '@newt-js/core/cluster/memory'
import { HttpRouter } from '@newt-js/core/http'
import { ${context.camel}Modules } from '../../${context.folder}-modules'
import type { ${type}_Module } from './${folder}.module'

let context: TestContext
let router: HttpRouter
let ${plural}: ${type}_Module
let signedIn: boolean

beforeEach(async () => {
  const database = ${opened.open}
  context = testContext({ name: '${context.folder}', cluster: new MemoryCluster(), database })
  router = new HttpRouter({ database })
  signedIn = true
  router.authenticateWith(async () => signedIn ? { userId: 'tester' } : null)
  ${plural} = ${context.camel}Modules(context.base, router).${names.module}
})

afterEach(() => context.close())

test('creates ${withArticle(words)} and reads it back', async () => {
  const created = await ${plural}.create({ name: ' First ' })

  expect(await ${plural}.get({ id: created.id })).toMatchObject({ id: created.id, name: 'First' })
  expect(await ${plural}.find({ name: 'First' })).toMatchObject([{ id: created.id }])
  expect(await ${plural}.paginate({}, { size: 10 })).toMatchObject({ items: [{ id: created.id }], total: 1 })
})

test('keeps each one apart, and finds them by their name', async () => {
  const first = await ${plural}.create({ name: 'First' })
  const second = await ${plural}.create({ name: 'Second' })
  const another = await ${plural}.create({ name: 'First' })

  expect(await ${plural}.get({ id: second.id })).toMatchObject({ id: second.id, name: 'Second' })
  expect((await ${plural}.find({ name: 'First' })).map(each => each.id).sort()).toEqual([first.id, another.id].sort())
  expect(await ${plural}.paginate({ name: 'Second' }, { size: 10 })).toMatchObject({ items: [{ id: second.id }], total: 1 })
  expect((await ${plural}.paginate({}, { size: 10 })).total).toBe(3)
})

test('refuses a name it cannot keep', async () => {
  await expect(${plural}.create({ name: '  ' })).rejects.toThrow()
})

test('says there is no ${words} with an id it does not have', async () => {
  const response = await router.answer(new Request(\`http://backend.test/api/${path}/\${Bun.randomUUIDv7()}\`))
  expect(response?.status).toBe(404)
})

test.each([
  ['POST', '/api/${path}'],
  ['GET', '/api/${path}'],
  ['GET', \`/api/${path}/\${Bun.randomUUIDv7()}\`],
])('%s %s answers 401 to who has not signed in', async (method, path) => {
  signedIn = false
  const response = await router.answer(new Request(\`http://backend.test\${path}\`, { method }))
  expect(response?.status).toBe(401)
})

test('creates one by its route and reads it by another', async () => {
  const posted = await router.answer(new Request('http://backend.test/api/${path}', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Second' }) }))
  expect(posted?.status).toBe(201)
  const { id } = await posted!.json() as { id: string }

  const read = await router.answer(new Request(\`http://backend.test/api/${path}/\${id}\`))
  expect(await read?.json()).toMatchObject({ id, name: 'Second' })
  const listed = await router.answer(new Request('http://backend.test/api/${path}'))
  expect(await listed?.json()).toMatchObject({ items: [{ id }], total: 1 })
})
`
}
