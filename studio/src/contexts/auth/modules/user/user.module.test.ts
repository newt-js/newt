import { DuplicateValue }          from '@newt-js/core'
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
// --------------------------------------------------------
import { Auth_Context }            from '../../auth.context'
import type { Application_Module } from '../application/application.module'
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

function call(method: string, path: string) {
  const url = `http://backend.test${router.prefix}${path}`
  return router.answer(new Request(url, { method }))
}

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
  const found = await users.find({ email: 'ana@example.com' })
  expect(found).toHaveLength(2)
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
  expect(() => User.create(props)).toThrow()
})

test('finds the users of an application by their email', async () => {
  const ana = await saved('ana@example.com')
  await saved('abel@example.com')

  const criteria = { applicationId: AUTH, email: 'Ana@Example.com' }
  expect(await users.find(criteria)).toMatchObject([{ id: ana.id }])
  const page = await users.paginate({ applicationId: AUTH }, { size: 10 })
  expect(page.total).toBe(2)
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
