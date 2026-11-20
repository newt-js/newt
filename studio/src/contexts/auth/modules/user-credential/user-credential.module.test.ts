import { DuplicateValue }             from '@newt-js/core'
import type { TestContext }           from '@newt-js/core/application/testing'
import { testContext }                from '@newt-js/core/application/testing'
import { MemoryCluster }              from '@newt-js/core/cluster/memory'
import { SqliteDatabase }             from '@newt-js/core/database/sqlite'
import { HttpRouter }                 from '@newt-js/core/http'
import { afterEach }                  from 'bun:test'
import { beforeEach }                 from 'bun:test'
import { expect }                     from 'bun:test'
import { spyOn }                      from 'bun:test'
import { test }                       from 'bun:test'
import { join }                       from 'node:path'
import { ZodError }                   from 'zod'
// --------------------------------------------------------
import { Auth_Context }               from '../../auth.context'
import type { Application_Module }    from '../application/application.module'
import { InvalidUserEmailLink }       from '../user-email-link/errors/invalid-user-email-link'
import { UserNotFound }               from '../user/errors/user-not-found'
import { SetupClosed }                from './errors/setup-closed'
import { UserCredential }             from './user-credential'
import type { UserCredential_Module } from './user-credential.module'
import { UserCredential_Repository }  from './user-credential.repository'
import { UserId }                     from './value-objects/user-id'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
/** auth's own application, which the first migration creates. */
const AUTH = '01a1f4f7-41e3-755d-adb7-298eb0bc0198'
const PASSWORD = 'correct horse battery staple'

let context: TestContext
let router: HttpRouter
let credentials: UserCredential_Module
let applications: Application_Module
let composed: Auth_Context
let stored: UserCredential_Repository
let userId: UserId

beforeEach(async () => {
  const database = await SqliteDatabase.open({
    path: ':memory:',
    migrations: MIGRATIONS,
  })
  const cluster = new MemoryCluster()
  context = testContext({ name: 'auth', cluster, database })
  router = new HttpRouter({ prefix: '/auth/api', database })
  router.authenticateWith(async () => ({ userId: 'tester' }))
  composed = Auth_Context.initialize(context.base, router)
  credentials = composed['userCredential']
  applications = composed['application']
  stored = new UserCredential_Repository(context.base)
  userId = await savedUser()
})

afterEach(() => context.close())

/** A row of user's table, as this test writes it. */
type UserRow = {
  id: string,
  version: number,
  applicationId: string,
  email: string,
  emailVerified: boolean,
  name: string,
  createdAt: string,
  updatedAt: string,
}

/** Users are born by use cases still to come: here, a row of its table. */
async function savedUser(
  applicationId = AUTH,
  email = 'ana@example.com',
): Promise<UserId> {
  const id = UserId.from(Bun.randomUUIDv7())
  const now = new Date().toISOString()
  await context.base.database.records<UserRow>('user').insert({
    id,
    applicationId,
    email,
    emailVerified: false,
    name: 'Ana',
    createdAt: now,
    updatedAt: now,
  })
  return id
}

async function passwordsOf(user: UserId): Promise<UserCredential[]> {
  return stored.find({ userId: user, kind: 'password' })
}

test('keeps a hash of the password, never the password', async () => {
  await credentials.setPassword({ userId, password: PASSWORD })

  const [password] = await passwordsOf(userId)
  expect(password!.secretHash).not.toContain(PASSWORD)
  expect(await Bun.password.verify(PASSWORD, password!.secretHash!)).toBe(true)
  expect(password!.toDTO()).not.toHaveProperty('secretHash')
})

test('verifies the password it was given, and no other', async () => {
  await credentials.setPassword({ userId, password: PASSWORD })

  const right = { userId, password: PASSWORD }
  expect(await credentials.verify(right)).toBe(true)
  const wrong = { userId, password: 'Correct horse battery staple' }
  expect(await credentials.verify(wrong)).toBe(false)
})

test('a user with no password verifies none', async () => {
  const any = { userId, password: PASSWORD }
  expect(await credentials.verify(any)).toBe(false)
})

test('a new password takes the place of the old one', async () => {
  await credentials.setPassword({ userId, password: PASSWORD })
  await credentials.setPassword({ userId, password: 'another pass phrase' })

  expect(await passwordsOf(userId)).toHaveLength(1)
  const old = { userId, password: PASSWORD }
  expect(await credentials.verify(old)).toBe(false)
  const current = { userId, password: 'another pass phrase' }
  expect(await credentials.verify(current)).toBe(true)
})

test('a user has one password at most, whatever saves it', async () => {
  const first = UserCredential.password({ userId, secretHash: 'a' })
  const second = UserCredential.password({ userId, secretHash: 'b' })
  await stored.persist(first)

  await expect(stored.persist(second)).rejects.toThrow(DuplicateValue)
})

test('refuses a password too short, and a user it does not have', async () => {
  const short = credentials.setPassword({ userId, password: 'short' })
  await expect(short).rejects.toThrow(ZodError)
  const nobody = { userId: Bun.randomUUIDv7(), password: PASSWORD }
  const noUser = credentials.setPassword(nobody)
  await expect(noUser).rejects.toThrow(UserNotFound)
})

test('tells what it creates without its secret', async () => {
  const told: unknown[] = []
  context.base.bus.subscribe('userCredential.created', event => {
    told.push(event)
  })

  await credentials.setPassword({ userId, password: PASSWORD })
  await context.settle()

  expect(told).toHaveLength(1)
  expect(JSON.stringify(told)).toContain(userId)
  expect(JSON.stringify(told)).not.toContain('secretHash')
  expect(JSON.stringify(told)).not.toContain('$argon2')
})

test('the setup gives the first admin of auth its password, once', async () => {
  await credentials.setFirstAdminPassword({ userId, password: PASSWORD })

  expect(await credentials.verify({ userId, password: PASSWORD })).toBe(true)
  const again = { userId, password: 'another pass phrase' }
  const closed = credentials.setFirstAdminPassword(again)
  await expect(closed).rejects.toThrow(SetupClosed)
})

test('the setup gives no password to a user of another application', async () => {
  const backOffice = await applications.create({ name: 'Back office' })
  const abel = await savedUser(backOffice.id)

  const given = { userId: abel, password: PASSWORD }
  const closed = credentials.setFirstAdminPassword(given)
  await expect(closed).rejects.toThrow(SetupClosed)
})

test('the setup closes once an admin of auth has a password', async () => {
  await credentials.setPassword({ userId, password: PASSWORD })
  const another = await savedUser(AUTH, 'eva@example.com')

  const given = { userId: another, password: PASSWORD }
  const closed = credentials.setFirstAdminPassword(given)
  await expect(closed).rejects.toThrow(SetupClosed)
})

test('two setups at once give a password to a single admin', async () => {
  const another = await savedUser(AUTH, 'eva@example.com')
  const setups = [userId, another].map(each => credentials.setFirstAdminPassword({ userId: each, password: PASSWORD }))

  const done = await Promise.allSettled(setups)

  expect(done.filter(each => each.status === 'fulfilled')).toHaveLength(1)
})

test('no route reads the credentials: the one there only sets a password from a link', async () => {
  const url = 'http://backend.test/auth/api/user-credentials'
  const response = await router.answer(new Request(url))
  expect(response?.status).toBe(405)
})

/** Abel, given access to backoffice, and the token of the link in its email. */
async function abelWithLink(): Promise<{ abelId: string, token: string }> {
  const emails: string[] = []
  spyOn(console, 'log').mockImplementation((text: string) => void emails.push(text))
  const backoffice = await applications.create({ name: 'Backoffice' })
  const abel = await composed['user'].grantAccess({ applicationId: backoffice.id, email: 'abel@example.com', name: 'Abel' })
  await context.settle()
  return { abelId: abel.id, token: emails[0]!.split('#token=')[1]! }
}

function setFromLink(token: string, password = PASSWORD) {
  return router.answer(new Request('http://backend.test/auth/api/user-credentials', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password }),
  }))
}

test('the link of an access email sets the first password, and proves the email', async () => {
  const { abelId, token } = await abelWithLink()

  expect((await setFromLink(token))?.status).toBe(204)
  await context.settle()

  expect(await credentials.verify({ userId: abelId, password: PASSWORD })).toBe(true)
  expect(await composed['user'].get(abelId)).toMatchObject({ emailVerified: true })
})

test('the link works once: the second time, whoever has it, it is refused', async () => {
  const { abelId, token } = await abelWithLink()
  await setFromLink(token)
  await context.settle()

  expect((await setFromLink(token, 'another pass phrase'))?.status).toBe(400)
  const again = credentials.setPasswordFromEmailLink({ token, password: 'another pass phrase' })
  await expect(again).rejects.toThrow(InvalidUserEmailLink)
  expect(await credentials.verify({ userId: abelId, password: PASSWORD })).toBe(true)
})

test('two tries at once with one link set a single password', async () => {
  const { abelId, token } = await abelWithLink()

  const tries = ['first pass phrase', 'second pass phrase'].map(password => credentials.setPasswordFromEmailLink({ token, password }))
  const done = await Promise.allSettled(tries)

  expect(done.filter(each => each.status === 'fulfilled')).toHaveLength(1)
  expect(await passwordsOf(UserId.from(abelId))).toHaveLength(1)
})

test('a link expires in three days, and a wrong one tells nothing', async () => {
  const { token } = await abelWithLink()

  expect((await setFromLink('not a token'))?.status).toBe(400)
  expect((await setFromLink('a'.repeat(500)))?.status).toBe(400)
  context.clock.advance(3 * 24 * 60 * 60 * 1000)
  expect((await setFromLink(token))?.status).toBe(400)
})

test('a password too short spends no link', async () => {
  const { token } = await abelWithLink()

  expect((await setFromLink(token, 'short'))?.status).toBe(400)
  expect((await setFromLink(token))?.status).toBe(204)
})
