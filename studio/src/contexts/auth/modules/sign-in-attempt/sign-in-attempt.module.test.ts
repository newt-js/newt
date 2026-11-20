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
import { SignInAttemptExpired }      from './errors/sign-in-attempt-expired'
import { SignInAttemptLocked }       from './errors/sign-in-attempt-locked'
import { UnexpectedSignInStep }      from './errors/unexpected-sign-in-step'
import { WrongCredentials }          from './errors/wrong-credentials'
import type { SignInAttempt_Module } from './sign-in-attempt.module'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
const JSON_HEADERS = { 'content-type': 'application/json' }
/** auth's own application, which the first migration creates. */
const AUTH = '01a1f4f7-41e3-755d-adb7-298eb0bc0198'
const ADMIN = { email: 'admin@example.com', name: 'Admin' }
const PASSWORD = 'correct horse battery staple'
const TEN_MINUTES = 10 * 60 * 1000

let context: TestContext
let router: HttpRouter
let composed: Auth_Context
let signInAttempts: SignInAttempt_Module
let signedIn: boolean
let adminId: string

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
  signInAttempts = composed['signInAttempt']
  const admin = await composed['user'].createFirstAdmin(ADMIN)
  adminId = admin.id
  const firstPassword = { userId: admin.id, password: PASSWORD }
  await composed['userCredential'].setFirstAdminPassword(firstPassword)
})

afterEach(() => context.close())

function call(method: string, path: string, body?: unknown) {
  const url = `http://backend.test${router.prefix}${path}`
  const init = body === undefined
    ? { method }
    : { method, headers: JSON_HEADERS, body: JSON.stringify(body) }
  return router.answer(new Request(url, init))
}

function startAs(email: string) {
  return signInAttempts.start({ applicationId: AUTH, email })
}

function answer(attemptId: string, password: string) {
  return signInAttempts.answerStep({ attemptId, step: 'password', answer: password })
}

test('signs in with the right password, and tells who and how', async () => {
  const told: unknown[] = []
  context.base.bus.subscribe('signInAttempt.completed', event => {
    told.push(event)
  })

  const started = await startAs(' Admin@Example.com ')
  expect(started).toMatchObject({ nextStep: 'password', completed: false })
  const done = await answer(started.id, PASSWORD)
  expect(done).toMatchObject({ nextStep: null, completed: true })

  await context.settle()
  expect(told).toMatchObject([{ payload: { userId: adminId, amr: ['password'] } }])
})

test('an unknown email and a wrong password look the same', async () => {
  const known = await startAs(ADMIN.email)
  const unknown = await startAs('nobody@example.com')

  expect(Object.keys(unknown)).toEqual(Object.keys(known))
  expect(unknown.nextStep).toBe(known.nextStep)
  await expect(answer(known.id, 'wrong password')).rejects.toThrow(WrongCredentials)
  await expect(answer(unknown.id, PASSWORD)).rejects.toThrow(WrongCredentials)
})

test('five wrong answers lock the attempt, right password or not', async () => {
  const started = await startAs(ADMIN.email)
  for (let tries = 0; tries < 5; tries++) {
    await expect(answer(started.id, 'wrong password')).rejects.toThrow(WrongCredentials)
  }

  await expect(answer(started.id, PASSWORD)).rejects.toThrow(SignInAttemptLocked)
})

test('an attempt lasts ten minutes', async () => {
  const started = await startAs(ADMIN.email)
  context.clock.advance(TEN_MINUTES)

  await expect(answer(started.id, PASSWORD)).rejects.toThrow(SignInAttemptExpired)
})

test('a completed attempt takes no more answers', async () => {
  const started = await startAs(ADMIN.email)
  await answer(started.id, PASSWORD)

  await expect(answer(started.id, PASSWORD)).rejects.toThrow(UnexpectedSignInStep)
})

test('a user of auth does not sign in to another application', async () => {
  const backOffice = await composed['application'].create({ name: 'Back office' })
  const elsewhere = { applicationId: backOffice.id, email: ADMIN.email }
  const started = await signInAttempts.start(elsewhere)

  await expect(answer(started.id, PASSWORD)).rejects.toThrow(WrongCredentials)
})

test('signs in by its routes, before having a session', async () => {
  signedIn = false

  const started = await call('POST', '/sign-in-attempts', { applicationId: AUTH, email: ADMIN.email })
  expect(started?.status).toBe(201)
  const { id } = await started!.json() as { id: string }
  const steps = `/sign-in-attempts/${id}/steps`
  const wrong = await call('POST', steps, { step: 'password', answer: 'wrong password' })
  expect(wrong?.status).toBe(401)
  const right = await call('POST', steps, { step: 'password', answer: PASSWORD })
  expect(await right?.json()).toMatchObject({ completed: true })
})
