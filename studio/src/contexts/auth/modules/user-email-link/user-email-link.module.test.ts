import type { TestContext }      from '@newt-js/core/application/testing'
import { testContext }           from '@newt-js/core/application/testing'
import { MemoryCluster }         from '@newt-js/core/cluster/memory'
import { SqliteDatabase }        from '@newt-js/core/database/sqlite'
import { HttpRouter }            from '@newt-js/core/http'
import { afterEach }             from 'bun:test'
import { beforeEach }            from 'bun:test'
import { expect }                from 'bun:test'
import { spyOn }                 from 'bun:test'
import { test }                  from 'bun:test'
import { join }                  from 'node:path'
// --------------------------------------------------------
import { Auth_Context }          from '../../auth.context'
import { InvalidUserEmailLink }  from './errors/invalid-user-email-link'
import type { UserEmailLinkRow } from './user-email-link.repository'
import { UserId }                from './value-objects/user-id'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000

let context: TestContext
let router: HttpRouter
let composed: Auth_Context
let emails: string[]

beforeEach(async () => {
  // These tests read the link of the email they get.
  Bun.env.AUTH_LOG_EMAIL_LINKS = 'true'
  const database = await SqliteDatabase.open({
    path: ':memory:',
    migrations: MIGRATIONS,
  })
  const cluster = new MemoryCluster()
  context = testContext({ name: 'auth', cluster, database })
  router = new HttpRouter({ prefix: '/auth/api', database })
  router.authenticateWith(async () => ({ userId: 'tester' }))
  composed = Auth_Context.initialize(context.base, router)
  emails = []
  spyOn(console, 'log').mockImplementation((text: string) => void emails.push(text))
})

afterEach(() => context.close())

/** Abel, given access to backoffice by an admin, once its email is out. */
async function grantAbel() {
  const backoffice = await composed['application'].create({ name: 'Backoffice' })
  const abel = await composed['user'].grantAccess({ applicationId: backoffice.id, email: 'abel@example.com', name: 'Abel' })
  await context.settle()
  return abel
}

function linksOf(userId: string): Promise<UserEmailLinkRow[]> {
  return context.base.database.records<UserEmailLinkRow>('user_email_link').find({ userId: UserId.from(userId) })
}

test('someone given access gets an email with its link, in its application\'s name', async () => {
  const abel = await grantAbel()

  expect(emails).toHaveLength(1)
  expect(emails[0]).toContain('to abel@example.com')
  expect(emails[0]).toContain('Backoffice')
  expect(emails[0]).toMatch(/\/access#token=[\w-]{43}$/)
  expect(await linksOf(abel.id)).toMatchObject([{ purpose: 'access', usedAt: null }])
})

test('the link is kept only as a hash, and lasts three days', async () => {
  const abel = await grantAbel()

  const token = emails[0]!.split('#token=')[1]!
  const [link] = await linksOf(abel.id)
  expect(link!.tokenHash).not.toContain(token)
  expect(JSON.stringify(link)).not.toContain(token)
  expect(Date.parse(link!.expiresAt) - Date.parse(link!.createdAt)).toBe(THREE_DAYS)
})

test('no route reads the links', async () => {
  const response = await router.answer(new Request('http://backend.test/auth/api/user-email-links'))
  expect(response?.status).toBe(405)
})

test('an email that fails to go is sent again, and only the link that went is kept', async () => {
  let tries = 0
  spyOn(console, 'log').mockImplementation((text: string) => {
    tries++
    if (tries === 1) {
throw new Error('mail down for a moment')
}
    emails.push(text)
  })

  const abel = await grantAbel()
  for (let each = 0; each < 5; each++) {
    context.clock.advance(10 * 60 * 1000)
    await context.settle()
  }

  expect(emails).toHaveLength(1)
  expect(await linksOf(abel.id)).toHaveLength(1)
})

function resend(userId: string) {
  return router.answer(new Request('http://backend.test/auth/api/user-email-links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userId }),
  }))
}

test('an admin sends a new access email once the link expired, and only the new link works', async () => {
  const abel = await grantAbel()
  const first = emails[0]!.split('#token=')[1]!
  context.clock.advance(THREE_DAYS)

  expect((await resend(abel.id))?.status).toBe(204)

  expect(emails).toHaveLength(2)
  const second = emails[1]!.split('#token=')[1]!
  const links = composed['userEmailLink']
  await expect(links.redeemable({ token: first, purpose: 'access' })).rejects.toThrow(InvalidUserEmailLink)
  expect(await links.redeemable({ token: second, purpose: 'access' })).toMatchObject({ user: { id: abel.id } })
})

test('a new access email spends the link sent before, even if it still works', async () => {
  const abel = await grantAbel()
  const first = emails[0]!.split('#token=')[1]!

  await composed['userEmailLink'].resendAccess({ userId: abel.id })

  await expect(composed['userEmailLink'].redeemable({ token: first, purpose: 'access' })).rejects.toThrow(InvalidUserEmailLink)
})

test('there is nothing to resend once the user proved its email, nor to whom does not exist', async () => {
  const abel = await grantAbel()
  const token = emails[0]!.split('#token=')[1]!
  await composed['userCredential'].setPasswordFromEmailLink({ token, password: 'correct horse battery staple' })
  await context.settle()

  expect((await resend(abel.id))?.status).toBe(409)
  expect((await resend(Bun.randomUUIDv7()))?.status).toBe(404)
  expect(emails).toHaveLength(1)
})

test('the token of a link is hidden in what is logged, unless told to show it', async () => {
  Bun.env.AUTH_LOG_EMAIL_LINKS = 'false'

  await grantAbel()

  expect(emails[0]).toMatch(/\/access#token=[\w-]{4}…$/)
})
