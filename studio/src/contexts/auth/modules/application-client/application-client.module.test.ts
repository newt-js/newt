import { NotFoundError }                 from '@newt-js/core'
import type { TestContext }              from '@newt-js/core/application/testing'
import { testContext }                   from '@newt-js/core/application/testing'
import { MemoryCluster }                 from '@newt-js/core/cluster/memory'
import { SqliteDatabase }                from '@newt-js/core/database/sqlite'
import { HttpRouter }                    from '@newt-js/core/http'
import { afterEach }                     from 'bun:test'
import { beforeEach }                    from 'bun:test'
import { expect }                        from 'bun:test'
import { test }                          from 'bun:test'
import { join }                          from 'node:path'
import { ZodError }                      from 'zod'
// --------------------------------------------------------
import { Auth_Context }                  from '../../auth.context'
import type { ApplicationClient_Module } from './application-client.module'
import type { ApplicationClientRow }     from './application-client.repository'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
const JSON_HEADERS = { 'content-type': 'application/json' }
const CALLBACK = 'https://backoffice.example.com/api/callback'

let context: TestContext
let router: HttpRouter
let composed: Auth_Context
let applicationClients: ApplicationClient_Module
let signedIn: boolean
let backofficeId: string

beforeEach(async () => {
  const database = await SqliteDatabase.open({
    path: ':memory:',
    migrations: MIGRATIONS,
  })
  const cluster = new MemoryCluster()
  context = testContext({ name: 'auth', cluster, database })
  router = new HttpRouter({ prefix: '/auth/api', database })
  signedIn = true
  router.authenticateWith(async () => signedIn ? { userId: 'tester' } : null)
  composed = Auth_Context.initialize(context.base, router)
  applicationClients = composed['applicationClient']
  backofficeId = (await composed['application'].create({ name: 'Backoffice' })).id
})

afterEach(() => context.close())

function call(method: string, path: string, body?: unknown) {
  const url = `http://backend.test${router.prefix}${path}`
  const init = body === undefined
    ? { method }
    : { method, headers: JSON_HEADERS, body: JSON.stringify(body) }
  return router.answer(new Request(url, init))
}

function register(changes: object = {}) {
  return applicationClients.register({ applicationId: backofficeId, name: 'Backoffice web', redirectUris: [CALLBACK], ...changes })
}

test('registers a client of an application, with its exact redirect uris', async () => {
  const { client } = await register({ postLogoutRedirectUris: ['https://backoffice.example.com/'] })

  expect(client).toMatchObject({
    application: { id: backofficeId, slug: 'backoffice' },
    name: 'Backoffice web',
    redirectUris: [CALLBACK],
    postLogoutRedirectUris: ['https://backoffice.example.com/'],
  })
  expect(await applicationClients.get(client.id)).toEqual(client)
})

test('its secret is seen once, when registered, and kept only as a hash', async () => {
  const told: unknown[] = []
  context.base.bus.subscribe('applicationClient.created', event => {
    told.push(event.payload)
  })

  const { client, secret } = await register()
  await context.settle()

  expect(secret.length).toBeGreaterThanOrEqual(43)
  expect(client).not.toHaveProperty('secretHash')
  expect(await applicationClients.get(client.id)).not.toHaveProperty('secretHash')
  expect(told).toHaveLength(1)
  expect(told[0]).not.toHaveProperty('secretHash')
  const [row] = await context.base.database.records<ApplicationClientRow>('application_client').find({})
  expect(row!.secretHash).not.toContain(secret)
  expect((await register()).secret).not.toBe(secret)
})

test('refuses a client with no redirect uri, a loose one, or of no application', async () => {
  await expect(register({ redirectUris: [] })).rejects.toThrow(ZodError)
  await expect(register({ redirectUris: ['http://backoffice.example.com/callback'] })).rejects.toThrow(ZodError)
  await expect(register({ redirectUris: [`${CALLBACK}#token`] })).rejects.toThrow(ZodError)
  await expect(register({ applicationId: Bun.randomUUIDv7() })).rejects.toThrow(NotFoundError)
})

test('the admin registers and reads clients by their routes', async () => {
  const registered = await call('POST', '/application-clients', { applicationId: backofficeId, name: 'Backoffice web', redirectUris: [CALLBACK] })

  expect(registered?.status).toBe(201)
  const { client, secret } = await registered!.json() as { client: { id: string }, secret: string }
  expect(secret).toBeString()
  const listed = await (await call('GET', '/application-clients'))!.json() as { items: object[] }
  expect(listed.items).toMatchObject([{ id: client.id }])
  expect(JSON.stringify(listed)).not.toContain('secret')
  expect((await call('GET', `/application-clients/${client.id}`))?.status).toBe(200)
  expect((await call('GET', `/application-clients/${Bun.randomUUIDv7()}`))?.status).toBe(404)
})

test.each([
  ['POST', '/application-clients'],
  ['GET', '/application-clients'],
])('%s %s answers 401 to who has not signed in', async (method, path) => {
  signedIn = false
  expect((await call(method, path, method === 'POST' ? {} : undefined))?.status).toBe(401)
})
