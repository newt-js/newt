import { DuplicateValue }            from '@newt-js/core'
import type { TestContext }          from '@newt-js/core/application/testing'
import { testContext }               from '@newt-js/core/application/testing'
import { MemoryCluster }             from '@newt-js/core/cluster/memory'
import { SqliteDatabase }            from '@newt-js/core/database/sqlite'
import { HttpRouter }                from '@newt-js/core/http'
import { afterEach }                 from 'bun:test'
import { beforeEach }                from 'bun:test'
import { expect }                    from 'bun:test'
import { test }                      from 'bun:test'
import { join }                      from 'node:path'
// --------------------------------------------------------
import { Auth_Context }              from '../../auth.context'
import { authenticate }              from '../../authenticate'
import { SignInAttemptExpired }      from '../sign-in-attempt/errors/sign-in-attempt-expired'
import { SignInNotCompleted }        from './errors/sign-in-not-completed'
import type { SignInSession_Module } from './sign-in-session.module'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
const JSON_HEADERS = { 'content-type': 'application/json' }
/** auth's own application, which the first migration creates. */
const AUTH = '01a1f4f7-41e3-755d-adb7-298eb0bc0198'
const ADMIN = { email: 'admin@example.com', name: 'Admin' }
const PASSWORD = 'correct horse battery staple'
const ELEVEN_MINUTES = 11 * 60 * 1000
const EIGHT_HOURS = 8 * 60 * 60 * 1000

let context: TestContext
let router: HttpRouter
let composed: Auth_Context
let signInSessions: SignInSession_Module
let adminId: string

beforeEach(async () => {
  const database = await SqliteDatabase.open({
    path: ':memory:',
    migrations: MIGRATIONS,
  })
  const cluster = new MemoryCluster()
  context = testContext({ name: 'auth', cluster, database })
  router = new HttpRouter({ prefix: '/auth/api', database })
  composed = Auth_Context.initialize(context.base, router)
  signInSessions = composed['signInSession']
  router.authenticateWith(authenticate(signInSessions))
  const admin = await composed['user'].createFirstAdmin(ADMIN)
  adminId = admin.id
  const firstPassword = { userId: admin.id, password: PASSWORD }
  await composed['userCredential'].setFirstAdminPassword(firstPassword)
})

afterEach(() => context.close())

function call(method: string, path: string, body?: unknown, cookie?: string) {
  const url = `http://backend.test${router.prefix}${path}`
  const headers = { ...body === undefined ? {} : JSON_HEADERS, ...cookie ? { cookie } : {} }
  const init = { method, headers, ...body === undefined ? {} : { body: JSON.stringify(body) } }
  return router.answer(new Request(url, init))
}

/** The id of an attempt of the admin, with every step done unless told otherwise. */
async function attempt({ completed = true } = {}): Promise<string> {
  const signInAttempts = composed['signInAttempt']
  const started = await signInAttempts.start({ applicationId: AUTH, email: ADMIN.email })
  if (completed) {
    await signInAttempts.answerStep({ attemptId: started.id, step: 'password', answer: PASSWORD })
  }
  return started.id
}

test('a completed attempt opens a session: who, where and how, and a token never kept', async () => {
  const told: unknown[] = []
  context.base.bus.subscribe('signInSession.created', event => {
    told.push(event.payload)
  })

  const { session, token } = await signInSessions.open({ attemptId: await attempt() })

  expect(session).toMatchObject({
    application: { id: AUTH, slug: 'auth' },
    user: { id: adminId },
    amr: ['password'],
    endedAt: null,
  })
  expect(token.length).toBeGreaterThanOrEqual(43)
  expect(session).not.toHaveProperty('tokenHash')
  expect(session).not.toHaveProperty('attemptId')
  expect(told).toHaveLength(1)
  expect(told[0]).not.toHaveProperty('tokenHash')
})

test('an attempt still to complete opens none', async () => {
  const opening = signInSessions.open({ attemptId: await attempt({ completed: false }) })
  await expect(opening).rejects.toThrow(SignInNotCompleted)
})

test('an attempt opens one session, never two', async () => {
  const attemptId = await attempt()
  await signInSessions.open({ attemptId })

  await expect(signInSessions.open({ attemptId })).rejects.toThrow(DuplicateValue)
})

test('an attempt left too long opens none', async () => {
  const attemptId = await attempt()
  context.clock.advance(ELEVEN_MINUTES)

  await expect(signInSessions.open({ attemptId })).rejects.toThrow(SignInAttemptExpired)
})

test('a token is of its user while its session lives, and only in its application', async () => {
  const { token } = await signInSessions.open({ attemptId: await attempt() })

  expect(await signInSessions.actorOf({ token, applicationSlug: 'auth' })).toEqual({ userId: adminId })
  expect(await signInSessions.actorOf({ token: 'not a token', applicationSlug: 'auth' })).toBeNull()
  expect(await signInSessions.actorOf({ token, applicationSlug: 'backoffice' })).toBeNull()
  context.clock.advance(EIGHT_HOURS)
  expect(await signInSessions.actorOf({ token, applicationSlug: 'auth' })).toBeNull()
})

test('signs in by the routes, and the cookie opens auth', async () => {
  expect((await call('GET', '/users'))?.status).toBe(401)

  const started = await call('POST', '/sign-in-attempts', { applicationId: AUTH, email: ADMIN.email })
  const { id } = await started!.json() as { id: string }
  await call('POST', `/sign-in-attempts/${id}/steps`, { step: 'password', answer: PASSWORD })
  const opened = await call('POST', '/sign-in-sessions', { attemptId: id })

  expect(opened?.status).toBe(201)
  const cookie = opened!.headers.get('set-cookie')!
  expect(cookie).toMatch(/^session_auth=[^;]+;/)
  expect(cookie).toContain('HttpOnly')
  expect(cookie).toContain('SameSite=Lax')
  const session = cookie.split(';')[0]!
  expect((await call('GET', '/users', undefined, session))?.status).toBe(200)
  expect((await call('GET', '/users', undefined, 'session_auth=forged'))?.status).toBe(401)
})

test('signing out ends the session, once and for all', async () => {
  const { token } = await signInSessions.open({ attemptId: await attempt() })

  await signInSessions.end(token)

  expect(await signInSessions.actorOf({ token, applicationSlug: 'auth' })).toBeNull()
  await signInSessions.end(token)
  await signInSessions.end('not a token')
})

test('signs out by its route: the cookie no longer opens auth, and goes', async () => {
  const { token } = await signInSessions.open({ attemptId: await attempt() })
  const session = `session_auth=${token}`

  const out = await call('DELETE', '/sign-in-sessions/current', undefined, session)

  expect(out?.status).toBe(204)
  expect(out?.headers.get('set-cookie')).toMatch(/^session_auth=;.*Max-Age=0/)
  expect((await call('GET', '/users', undefined, session))?.status).toBe(401)
  const without = await call('DELETE', '/sign-in-sessions/current')
  expect(without?.status).toBe(204)
})

test('a body with no attempt is refused as such, never a fault', async () => {
  expect((await call('POST', '/sign-in-sessions', null))?.status).toBe(400)
  expect((await call('POST', '/sign-in-sessions', {}))?.status).toBe(400)
})

test('a cookie no session could have is no one, and signing out still clears it', async () => {
  const forged = `session_auth=${'a'.repeat(200)}`

  expect((await call('GET', '/users', undefined, forged))?.status).toBe(401)
  const out = await call('DELETE', '/sign-in-sessions/current', undefined, forged)
  expect(out?.status).toBe(204)
  expect(out?.headers.get('set-cookie')).toMatch(/^session_auth=;.*Max-Age=0/)
})

/** A user of another application with a password, as a row of user's table: users of others are born in a later step. */
async function userOf(applicationId: string, email: string): Promise<string> {
  const id = Bun.randomUUIDv7()
  const now = new Date().toISOString()
  const row = { id, applicationId, email, emailVerified: false, name: 'Abel', createdAt: now, updatedAt: now }
  await context.base.database.records('user').insert(row)
  await composed['userCredential'].setPassword({ userId: id, password: PASSWORD })
  return id
}

test('only users of auth manage auth: a session of another application opens none of its routes', async () => {
  const backoffice = await composed['application'].create({ name: 'Backoffice' })
  await userOf(backoffice.id, 'abel@example.com')
  const started = await call('POST', '/sign-in-attempts', { applicationId: backoffice.id, email: 'abel@example.com' })
  const { id } = await started!.json() as { id: string }
  await call('POST', `/sign-in-attempts/${id}/steps`, { step: 'password', answer: PASSWORD })

  const opened = await call('POST', '/sign-in-sessions', { attemptId: id })

  const cookie = opened!.headers.get('set-cookie')!.split(';')[0]!
  expect(cookie).toMatch(/^session_backoffice=/)
  const asAuth = cookie.replace('session_backoffice', 'session_auth')
  for (const path of ['/users', '/applications']) {
    expect((await call('GET', path, undefined, cookie))?.status).toBe(401)
    expect((await call('GET', path, undefined, asAuth))?.status).toBe(401)
  }
})
