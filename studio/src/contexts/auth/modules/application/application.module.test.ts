import type { TestContext }        from '@newt-js/core/application/testing'
import { testContext }             from '@newt-js/core/application/testing'
import { MemoryCluster }           from '@newt-js/core/cluster/memory'
import { SqliteDatabase }          from '@newt-js/core/database/sqlite'
import { HttpRouter }              from '@newt-js/core/http'
import { afterEach }               from 'bun:test'
import { beforeEach }              from 'bun:test'
import { expect }                  from 'bun:test'
import { test }                    from 'bun:test'
import { join }                    from 'node:path'
import { ZodError }                from 'zod'
// --------------------------------------------------------
import { Auth_Context }            from '../../auth.context'
import type { Application_Module } from './application.module'
import { ApplicationNotFound }     from './errors/application-not-found'
import { SlugTaken }               from './errors/slug-taken'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
const JSON_HEADERS = { 'content-type': 'application/json' }
const BACK_OFFICE = { slug: 'backoffice', name: 'Back office' }

let context: TestContext
let router: HttpRouter
let composed: Auth_Context
let applications: Application_Module
let signedIn: boolean

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
  applications = composed['application']
})

afterEach(() => context.close())

function call(method: string, path: string, body?: unknown) {
  const url = `http://backend.test${router.prefix}${path}`
  const init = body === undefined
    ? { method }
    : { method, headers: JSON_HEADERS, body: JSON.stringify(body) }
  return router.answer(new Request(url, init))
}

test('auth has its own application from the first migration', async () => {
  expect(await applications.find({ slug: ' AUTH ' })).toMatchObject([
    { slug: 'auth', name: 'auth', registration: 'closed' },
  ])
})

test('creates an application, closed, and reads it back', async () => {
  const created = await applications.create({
    slug: ' BackOffice ',
    name: ' Back office ',
  })

  expect(created).toMatchObject({ ...BACK_OFFICE, registration: 'closed' })
  const read = await applications.get(created.id)
  expect(read).toMatchObject({ id: created.id })
  const found = await applications.find({ slug: 'backoffice' })
  expect(found).toMatchObject([{ id: created.id }])
  const page = await applications.paginate({ slug: 'backoffice' }, { size: 10 })
  expect(page).toMatchObject({ items: [{ id: created.id }], total: 1 })
})

test('refuses a slug another application has', async () => {
  await applications.create(BACK_OFFICE)

  const again = applications.create({ slug: 'backoffice', name: 'Other' })
  await expect(again).rejects.toThrow(SlugTaken)
  const auths = applications.create({ slug: 'auth', name: 'Other' })
  await expect(auths).rejects.toThrow(SlugTaken)
})

test('without a slug, makes one from the name', async () => {
  const created = await applications.create({ name: ' Gestión  Fincas ' })
  expect(created.slug).toBe('gestion-fincas')
})

test('a slug made from a name another has takes the next number', async () => {
  await applications.create({ slug: 'fincas', name: 'Fincas' })
  await applications.create({ slug: 'fincas-2', name: 'Fincas' })

  const third = await applications.create({ name: 'Fincas' })
  expect(third.slug).toBe('fincas-3')
  const slugs = []
  for (let each = 0; each < 10; each++) {
    slugs.push((await applications.create({ name: 'Fincas' })).slug)
  }
  expect(slugs.at(-1)).toBe('fincas-13')
})

test('a name with nothing to keep makes the slug application', async () => {
  const created = await applications.create({ name: '¡¿!?' })
  expect(created.slug).toBe('application')
})

test('a slug made from a long name leaves room for its number', async () => {
  const created = await applications.create({ name: 'a'.repeat(100) })
  expect(created.slug).toBe('a'.repeat(34))
})

const MALFORMED = [' ', 'a', 'back office', 'back_office', '-back', 'back-']

test.each(MALFORMED)('refuses %p as a slug', async slug => {
  const created = applications.create({ slug, name: 'Back office' })
  await expect(created).rejects.toThrow(ZodError)
})

test('refuses a name it cannot keep', async () => {
  const created = applications.create({ slug: 'backoffice', name: '  ' })
  await expect(created).rejects.toThrow(ZodError)
})

test('says there is no application with an id it does not have', async () => {
  const response = await call('GET', `/applications/${Bun.randomUUIDv7()}`)
  expect(response?.status).toBe(404)
})

test.each([
  ['POST', '/applications'],
  ['GET', '/applications'],
  ['GET', `/applications/${Bun.randomUUIDv7()}`],
])('%s %s answers 401 to who has not signed in', async (method, path) => {
  signedIn = false
  const response = await call(method, path)
  expect(response?.status).toBe(401)
})

test('creates one by its route and reads it by another', async () => {
  const posted = await call('POST', '/applications', BACK_OFFICE)
  expect(posted?.status).toBe(201)
  const { id } = await posted!.json() as { id: string }

  const read = await call('GET', `/applications/${id}`)
  expect(await read?.json()).toMatchObject({ id, slug: 'backoffice' })
  const listed = await call('GET', '/applications')
  expect(await listed?.json()).toMatchObject({ total: 2 })
})

test('makes the slug by its route too, and answers with it', async () => {
  const posted = await call('POST', '/applications', { name: 'Back office' })
  expect(posted?.status).toBe(201)
  expect(await posted!.json()).toMatchObject({ slug: 'back-office' })
})

test('answers 409 to a slug that is taken', async () => {
  const taken = { slug: 'auth', name: 'Other' }
  const posted = await call('POST', '/applications', taken)
  expect(posted?.status).toBe(409)
})

test('an application is found by its subdomain, and is at that address', async () => {
  Bun.env.AUTH_APPLICATIONS_URL = 'http://auth.test:3000'
  const backoffice = await applications.create({ name: 'Backoffice' })

  const found = await applications.fromHost('Backoffice.Auth.Test:3000')

  expect(found).toEqual({ application: backoffice, url: 'http://backoffice.auth.test:3000' })
})

test.each([
  'auth.test:3000',
  'panel.auth.test:3000',
  'backoffice.auth.test',
  'backoffice.auth.test:3000.evil.test',
  'a.backoffice.auth.test:3000',
  'backoffice.evil.test:3000',
])('no application is at %s', async host => {
  Bun.env.AUTH_APPLICATIONS_URL = 'http://auth.test:3000'
  await applications.create({ name: 'Backoffice' })

  await expect(applications.fromHost(host)).rejects.toThrow(ApplicationNotFound)
})
