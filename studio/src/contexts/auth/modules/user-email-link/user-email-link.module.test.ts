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
import type { UserEmailLinkRow } from './user-email-link.repository'
import { UserId }                from './value-objects/user-id'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000

let context: TestContext
let router: HttpRouter
let composed: Auth_Context
let emails: string[]

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

test('no route reaches the links', async () => {
  const response = await router.answer(new Request('http://backend.test/auth/api/user-email-links'))
  expect(response?.status).toBe(404)
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
