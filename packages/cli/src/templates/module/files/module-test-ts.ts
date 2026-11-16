import type { ModuleNames } from '../../../names/module-names/module-names'

export function moduleTestTs({ folder, type, plural, path, words }: ModuleNames, context: string): string {
  return `import { afterEach, beforeEach, expect, test } from 'bun:test'
import { testContext, type TestContext } from '@newt-js/core/application/testing'
import { MemoryCluster } from '@newt-js/core/cluster/memory'
import { MemoryDatabase } from '@newt-js/core/database/memory'
import { HttpRouter } from '@newt-js/core/http'
import { ${type}_Module } from './${folder}.module'

let context: TestContext
let router: HttpRouter
let ${plural}: ${type}_Module

beforeEach(() => {
  const database = new MemoryDatabase()
  context = testContext({ name: '${context}', cluster: new MemoryCluster(), database })
  router = new HttpRouter({ database })
  router.authenticateWith(async () => ({ userId: 'tester' }))
  ${plural} = ${type}_Module.initialize(context.base, router)
})

afterEach(() => context.close())

test('creates a ${words} and reads it back', async () => {
  const created = await ${plural}.create({ name: ' First ' })

  expect(await ${plural}.get({ id: created.id })).toMatchObject({ id: created.id, name: 'First' })
  expect(await ${plural}.find({ name: 'First' })).toMatchObject([{ id: created.id }])
  expect(await ${plural}.paginate({}, { size: 10 })).toMatchObject({ items: [{ id: created.id }], total: 1 })
})

test('refuses a name it cannot keep', async () => {
  await expect(${plural}.create({ name: '  ' })).rejects.toThrow()
})

test('says there is no ${words} with an id it does not have', async () => {
  const response = await router.answer(new Request(\`http://backend.test/api/${path}/\${Bun.randomUUIDv7()}\`))
  expect(response?.status).toBe(404)
})

test('creates one by its route and reads it by another', async () => {
  const posted = await router.answer(new Request('http://backend.test/api/${path}', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Second' }) }))
  expect(posted?.status).toBe(201)
  const { id } = await posted!.json() as { id: string }

  const read = await router.answer(new Request(\`http://backend.test/api/${path}/\${id}\`))
  expect(await read?.json()).toMatchObject({ id, name: 'Second' })
})
`
}
