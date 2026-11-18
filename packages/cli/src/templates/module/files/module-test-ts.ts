import type { ContextNames } from '../../../names/context-names/context-names'
import type { ModuleNames }  from '../../../names/module-names/module-names'
import { withArticle }       from '../../../names/with-article/with-article'
import type { DatabaseKind } from '../../stores/store-databases'

const MIGRATIONS = "join(import.meta.dir, '../../../../migrations')"

/** On sqlite, the context's own migrations on a database in memory; on a server, src/test-database.ts's, real when TEST_DATABASE_URL is set. */
function databaseOf(database: DatabaseKind): { imports: string, open: string, drop: boolean } {
  if (database === 'sqlite') {
    return {
      imports: "import { join } from 'node:path'\nimport { SqliteDatabase } from '@newt-js/core/database/sqlite'",
      open: `await SqliteDatabase.open({ path: ':memory:', migrations: ${MIGRATIONS} })`,
      drop: false,
    }
  }
  if (database === 'postgres' || database === 'mysql') {
    return { imports: "import { join } from 'node:path'\nimport { testDatabase } from '../../../../../../test-database'", open: `await testDatabase(${MIGRATIONS})`, drop: true }
  }
  return { imports: "import { MemoryDatabase } from '@newt-js/core/database/memory'", open: 'new MemoryDatabase()', drop: false }
}

export function moduleTestTs(names: ModuleNames, context: ContextNames, database: DatabaseKind): string {
  const { folder, type, plural, words } = names
  const { path } = names
  const opened = databaseOf(database)
  return `import { afterEach, beforeEach, expect, test } from 'bun:test'
${opened.imports}
import { modulesOf, testContext, type TestContext } from '@newt-js/core/application/testing'
import { MemoryCluster } from '@newt-js/core/cluster/memory'
import { HttpRouter } from '@newt-js/core/http'
import { ${context.camel}Features, type ${context.type}Features } from '../../../../${context.folder}-features'
import type { ${type}_Module } from './${folder}.module'

let context: TestContext
let router: HttpRouter
let features: ${context.type}Features
let ${plural}: ${type}_Module
let signedIn: boolean
${opened.drop ? 'let dropDatabase: () => Promise<void>\n' : ''}
beforeEach(async () => {
  ${opened.drop ? `const { database, drop } = ${opened.open}\n  dropDatabase = drop` : `const database = ${opened.open}`}
  context = testContext({ name: '${context.folder}', cluster: new MemoryCluster(), database })
  router = new HttpRouter({ prefix: '/${context.folder}/api', database })
  signedIn = true
  router.authenticateWith(async () => signedIn ? { userId: 'tester' } : null)
  features = ${context.camel}Features(context.base, router)
  ${plural} = modulesOf(features.${names.feature.camel}).${names.module}
})

${opened.drop ? 'afterEach(async () => {\n  await context.close()\n  await dropDatabase()\n})' : 'afterEach(() => context.close())'}

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
  const response = await router.answer(new Request(\`http://backend.test/${context.folder}/api/${path}/\${Bun.randomUUIDv7()}\`))
  expect(response?.status).toBe(404)
})

test.each([
  ['POST', '/${context.folder}/api/${path}'],
  ['GET', '/${context.folder}/api/${path}'],
  ['GET', \`/${context.folder}/api/${path}/\${Bun.randomUUIDv7()}\`],
])('%s %s answers 401 to who has not signed in', async (method, path) => {
  signedIn = false
  const response = await router.answer(new Request(\`http://backend.test\${path}\`, { method }))
  expect(response?.status).toBe(401)
})

test('creates one by its route and reads it by another', async () => {
  const posted = await router.answer(new Request('http://backend.test/${context.folder}/api/${path}', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Second' }) }))
  expect(posted?.status).toBe(201)
  const { id } = await posted!.json() as { id: string }

  const read = await router.answer(new Request(\`http://backend.test/${context.folder}/api/${path}/\${id}\`))
  expect(await read?.json()).toMatchObject({ id, name: 'Second' })
  const listed = await router.answer(new Request('http://backend.test/${context.folder}/api/${path}'))
  expect(await listed?.json()).toMatchObject({ items: [{ id }], total: 1 })
})
`
}
