import { DuplicateValue }          from '@newt-js/core'
import { InvalidEntity }           from '@newt-js/core'
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
import type { Application_Module } from '../application/application.module'
import { SetupClosed }             from './errors/setup-closed'
import { User }                    from './user'
import type { User_Module }        from './user.module'
import { User_Repository }         from './user.repository'
import type { UserDTO }            from './user.schema'
import { ApplicationId }           from './value-objects/application-id'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
/** auth's own application, which the first migration creates. */
const AUTH = ApplicationId.from('01a1f4f7-41e3-755d-adb7-298eb0bc0198')

let context: TestContext
let router: HttpRouter
let users: User_Module
let applications: Application_Module
let repository: User_Repository
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
  const composed = Auth_Context.initialize(context.base, router)
  users = composed['user']
  applications = composed['application']
  repository = new User_Repository(context.base, { application: applications })
})

afterEach(() => context.close())

/** Users are born by use cases of their own, still to come: here, saved. */
async function saved(
  email: string | null,
  applicationId = AUTH,
): Promise<UserDTO> {
  const application = await applications.get(applicationId)
  const user = User.create({ application, email, name: 'Ana' })
  await repository.persist(user)
  return user.toDTO()
}

async function anotherApplication(): Promise<ApplicationId> {
  const created = await applications.create({ name: 'Back office' })
  return ApplicationId.from(created.id)
}

function call(method: string, path: string, body?: unknown) {
  const url = `http://backend.test${router.prefix}${path}`
  const json = body === undefined ? {} : {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
  return router.answer(new Request(url, { method, ...json }))
}

const ADMIN = { email: 'Admin@Example.com', name: 'Admin' }

test('the setup creates the first admin of auth, and only the first', async () => {
  const admin = await users.createFirstAdmin(ADMIN)

  expect(admin).toMatchObject({
    application: { id: AUTH },
    email: 'admin@example.com',
    emailVerified: false,
  })
  const ofAuth = await users.find({ applicationId: AUTH })
  expect(ofAuth).toMatchObject([{ id: admin.id }])
  const again = users.createFirstAdmin({ ...ADMIN, email: 'eve@example.com' })
  await expect(again).rejects.toThrow(SetupClosed)
})

test('several setups at once leave a single admin', async () => {
  const emails = ['ana@example.com', 'abel@example.com', 'eva@example.com']
  const setups = emails.map(email => users.createFirstAdmin({ ...ADMIN, email }))

  const done = await Promise.allSettled(setups)

  expect(done.filter(each => each.status === 'fulfilled')).toHaveLength(1)
  expect(await users.find({ applicationId: AUTH })).toHaveLength(1)
})

test('the first admin signs in by its email, so it needs one', async () => {
  const nameless = users.createFirstAdmin({ email: null as never, name: 'A' })
  await expect(nameless).rejects.toThrow(ZodError)
})

test('users of other applications leave the setup open', async () => {
  await saved('abel@example.com', await anotherApplication())

  expect(await users.createFirstAdmin(ADMIN)).toBeDefined()
})

test('the whole setup by its routes, before anyone signs in', async () => {
  signedIn = false

  const created = await call('POST', '/setup', ADMIN)
  expect(created?.status).toBe(201)
  const { id } = await created!.json() as UserDTO
  const password = { userId: id, password: 'correct horse battery staple' }
  expect((await call('POST', '/setup/password', password))?.status).toBe(204)

  expect((await call('POST', '/setup', ADMIN))?.status).toBe(409)
  const again = { ...password, password: 'another pass phrase' }
  expect((await call('POST', '/setup/password', again))?.status).toBe(409)
})

test('a user is of an application, its email lower case', async () => {
  const ana = await saved(' Ana@Example.com ')

  expect(ana).toMatchObject({
    application: { id: AUTH, slug: 'auth' },
    email: 'ana@example.com',
    emailVerified: false,
  })
  expect(await users.get(ana.id)).toMatchObject({ id: ana.id })
})

test('the same email in two applications is two users', async () => {
  const backoffice = await anotherApplication()
  const inAuth = await saved('ana@example.com')
  const inBackoffice = await saved('ana@example.com', backoffice)

  expect(inAuth.id).not.toBe(inBackoffice.id)
  const email = 'ana@example.com'
  const auth = await users.find({ applicationId: AUTH, email })
  expect(auth).toMatchObject([{ id: inAuth.id }])
  const other = await users.find({ applicationId: backoffice, email })
  expect(other).toMatchObject([{ id: inBackoffice.id }])
})

test('the same email twice in one application is refused', async () => {
  await saved('ana@example.com')

  const again = saved('ANA@example.com')
  await expect(again).rejects.toThrow(DuplicateValue)
})

test('a user may have no email, and many of one application', async () => {
  const first = await saved(null)
  const second = await saved(null)

  expect(first.email).toBeNull()
  expect(second.id).not.toBe(first.id)
  expect(await users.get(first.id)).toMatchObject({ email: null })
})

test('refuses an email it cannot keep', async () => {
  const application = await applications.get(AUTH)
  const props = { application, email: 'ana', name: 'Ana' }
  expect(() => User.create(props)).toThrow(InvalidEntity)
})

test('finds a user of an application by its email, as typed', async () => {
  const ana = await saved('ana@example.com')
  await saved('abel@example.com')

  const typed = { applicationId: AUTH, email: ' Ana@Example.com ' }
  expect(await users.find(typed)).toMatchObject([{ id: ana.id }])
  const unknown = { applicationId: AUTH, email: 'eva@example.com' }
  expect(await users.find(unknown)).toEqual([])
  const page = await users.paginate({ applicationId: AUTH }, { size: 10 })
  expect(page.total).toBe(2)
})

test('lists every user by its route', async () => {
  const ana = await saved('ana@example.com')

  const listed = await call('GET', '/users')
  expect(await listed?.json()).toMatchObject({ items: [{ id: ana.id }] })
})

test('says there is no user with an id it does not have', async () => {
  const response = await call('GET', `/users/${Bun.randomUUIDv7()}`)
  expect(response?.status).toBe(404)
})

test.each([
  ['GET', '/users'],
  ['GET', `/users/${Bun.randomUUIDv7()}`],
])('%s %s answers 401 to who has not signed in', async (method, path) => {
  signedIn = false
  const response = await call(method, path)
  expect(response?.status).toBe(401)
})

test('reads one by its route', async () => {
  const ana = await saved('ana@example.com')

  const read = await call('GET', `/users/${ana.id}`)
  expect(await read?.json()).toMatchObject({ id: ana.id, email: ana.email })
})
