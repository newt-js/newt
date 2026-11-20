import { afterAll }     from 'bun:test'
import { beforeAll }    from 'bun:test'
import { expect }       from 'bun:test'
import { spyOn }        from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { startBackend } from './index'

/** auth's own application, which its first migration creates. */
const AUTH = '01a1f4f7-41e3-755d-adb7-298eb0bc0198'
const PASSWORD = 'correct horse battery staple'

let backend: Awaited<ReturnType<typeof startBackend>>
/** The backend, as backoffice's browser reaches it. */
let site: string
/** The backend at backoffice's subdomain, where auth serves the backoffice application. */
let backofficeAtAuth: string
let backofficeId: string
let abelId: string
let logs: ReturnType<typeof spyOn>
const emails: string[] = []
/** The settings these tests change, put back after. */
const SETTINGS = [
  'PUBLIC_URL', 'AUTH_APPLICATIONS_URL', 'AUTH_LOG_EMAIL_LINKS',
  'BACKOFFICE_AUTH_ISSUER', 'BACKOFFICE_AUTH_CLIENT_ID', 'BACKOFFICE_AUTH_CLIENT_SECRET',
]
const settingsBefore = Object.fromEntries(SETTINGS.map(name => [name, Bun.env[name]]))

/** A browser: one jar of cookies per host, following no redirect, so each step is seen. */
class Browser {

  private readonly jars = new Map<string, Map<string, string>>()

  async go(url: string, init: RequestInit = {}): Promise<Response> {
    const { host } = new URL(url)
    const jar = this.jars.get(host) ?? new Map<string, string>()
    this.jars.set(host, jar)
    const headers = new Headers(init.headers)
    const cookie = [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
    if (cookie) {
      headers.set('cookie', cookie)
    }
    const response = await fetch(url, { ...init, headers, redirect: 'manual' })
    for (const set of response.headers.getSetCookie()) {
      const [pair = ''] = set.split(';')
      const [name = '', value = ''] = pair.split('=')
      if (value === '' || /max-age=0/i.test(set)) {
        jar.delete(name)
      } else {
        jar.set(name, value)
      }
    }
    return response
  }

  post(url: string, body: unknown): Promise<Response> {
    return this.go(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  }

  cookie(host: string, name: string): string | undefined {
    return this.jars.get(new URL(host).host)?.get(name)
  }

}

/** Where a redirect sends the browser. */
function locationOf(response: Response): string {
  expect(response.status).toBe(302)
  return response.headers.get('location')!
}

/** Signs in to an application of auth, through its API, as its login page will. */
async function signInAtAuth(browser: Browser, at: string, applicationId: string, email: string) {
  const started = await browser.post(`${at}/auth/api/sign-in-attempts`, { applicationId, email })
  const { id } = await started.json() as { id: string }
  await browser.post(`${at}/auth/api/sign-in-attempts/${id}/steps`, { step: 'password', answer: PASSWORD })
  const opened = await browser.post(`${at}/auth/api/sign-in-sessions`, { attemptId: id })
  expect(opened.status).toBe(201)
}

/** What an admin of auth does once: the setup, backoffice's application and client, and Abel with access to it. */
async function prepareAuth() {
  const admin = new Browser()
  const setup = await admin.post(`${site}/auth/api/setup`, { email: 'angel@example.com', name: 'Angel' })
  const { id: adminId } = await setup.json() as { id: string }
  await admin.post(`${site}/auth/api/setup/password`, { userId: adminId, password: PASSWORD })
  await signInAtAuth(admin, site, AUTH, 'angel@example.com')
  const application = await admin.post(`${site}/auth/api/applications`, { name: 'Backoffice' })
  backofficeId = (await application.json() as { id: string }).id
  const registered = await admin.post(`${site}/auth/api/application-clients`, {
    applicationId: backofficeId,
    name: 'Backoffice backend',
    redirectUris: [`${site}/backoffice/api/sign-in-sessions/callback`],
    postLogoutRedirectUris: [`${site}/`],
  })
  const { client, secret } = await registered.json() as { client: { id: string }, secret: string }
  Bun.env.BACKOFFICE_AUTH_ISSUER = `${backofficeAtAuth}/auth/api`
  Bun.env.BACKOFFICE_AUTH_CLIENT_ID = client.id
  Bun.env.BACKOFFICE_AUTH_CLIENT_SECRET = secret
  const granted = await admin.post(`${site}/auth/api/users`, { applicationId: backofficeId, email: 'abel@example.com', name: 'Abel' })
  abelId = (await granted.json() as { id: string }).id
  // The access email goes out from a worker, after the answer.
  for (let tries = 0; emails.length === 0 && tries < 100; tries++) {
    await Bun.sleep(20)
  }
  const token = emails[0]!.split('#token=')[1]!
  const access = await new Browser().post(`${site}/auth/api/user-credentials`, { token, password: PASSWORD })
  expect(access.status).toBe(204)
}

beforeAll(async () => {
  Bun.env.AUTH_SIGNING_KEYS_SECRET ??= Buffer.alloc(32, 1).toString('base64url')
  Bun.env.AUTH_LOG_EMAIL_LINKS = 'true'
  logs = spyOn(console, 'log')
  logs.mockImplementation((text: string) => void emails.push(text))
  backend = await startBackend(0, { data: 'memory' })
  const { port } = backend.server!
  site = `http://localhost:${port}`
  backofficeAtAuth = `http://backoffice.localhost:${port}`
  Bun.env.PUBLIC_URL = site
  Bun.env.AUTH_APPLICATIONS_URL = site
  await prepareAuth()
})

afterAll(async () => {
  await backend.stop()
  logs.mockRestore()
  for (const [name, value] of Object.entries(settingsBefore)) {
    if (value === undefined) {
      delete Bun.env[name]
    } else {
      Bun.env[name] = value
    }
  }
})

test('backoffice sends the browser to auth to sign in, tied to it by a cookie', async () => {
  const browser = new Browser()

  const started = await browser.post(`${site}/backoffice/api/sign-in-attempts`, {})

  expect(started.status).toBe(201)
  const { redirectTo } = await started.json() as { redirectTo: string }
  const authorize = new URL(redirectTo)
  expect(authorize.origin + authorize.pathname).toBe(`${backofficeAtAuth}/auth/api/oauth-authorizations/authorize`)
  expect(authorize.searchParams.get('state')).toBe(browser.cookie(site, '__Host-backoffice_sign_in')!)
  expect(authorize.searchParams.get('code_challenge_method')).toBe('S256')
  // Abel has no session at auth yet: auth asks to sign in, and comes back to /authorize after.
  const signIn = new URL(locationOf(await browser.go(redirectTo)))
  expect(signIn.origin + signIn.pathname).toBe(`${backofficeAtAuth}/sign-in`)
  expect(signIn.searchParams.get('return_to')).toBe(redirectTo)
})

/** Abel signs in to backoffice, through auth: the address auth sends the browser back to, with its code. */
async function abelComesBack(browser: Browser): Promise<string> {
  const started = await browser.post(`${site}/backoffice/api/sign-in-attempts`, {})
  const { redirectTo } = await started.json() as { redirectTo: string }
  const signIn = new URL(locationOf(await browser.go(redirectTo)))
  await signInAtAuth(browser, backofficeAtAuth, backofficeId, 'abel@example.com')
  return locationOf(await browser.go(signIn.searchParams.get('return_to')!))
}

test('Abel comes back from auth with a code, and backoffice opens its own session', async () => {
  const browser = new Browser()
  const callback = await abelComesBack(browser)
  expect(callback.startsWith(`${site}/backoffice/api/sign-in-sessions/callback?`)).toBe(true)

  const back = await browser.go(callback)

  expect(locationOf(back)).toBe('/')
  expect(browser.cookie(site, '__Host-backoffice_session')).toBeDefined()
  expect(browser.cookie(site, '__Host-backoffice_sign_in')).toBeUndefined()
})

test('a code comes back only to the browser that started: another one, or the same twice, opens nothing', async () => {
  const browser = new Browser()
  const callback = await abelComesBack(browser)
  const stolenCookie = browser.cookie(site, '__Host-backoffice_sign_in')!

  const another = new Browser()
  expect((await another.go(callback)).status).toBe(400)
  expect(another.cookie(site, '__Host-backoffice_session')).toBeUndefined()
  expect(locationOf(await browser.go(callback))).toBe('/')
  const again = await fetch(callback, { headers: { cookie: `__Host-backoffice_sign_in=${stolenCookie}` }, redirect: 'manual' })
  expect(again.status).toBe(400)
})

test('two callbacks at once open a single session', async () => {
  const browser = new Browser()
  const callback = await abelComesBack(browser)
  const cookie = `__Host-backoffice_sign_in=${browser.cookie(site, '__Host-backoffice_sign_in')}`

  const answers = await Promise.all([1, 2, 3].map(() => fetch(callback, { headers: { cookie }, redirect: 'manual' })))

  expect(answers.map(each => each.status).sort()).toEqual([302, 400, 400])
})

test('an answer of auth that is not its own, or an error, finishes nothing', async () => {
  const browser = new Browser()
  const callback = new URL(await abelComesBack(browser))
  const tampered = [
    { iss: 'http://evil.example/auth/api' },
    { code: 'not the code' },
    { error: 'access_denied' },
    { iss: '' },
  ]

  for (const change of tampered) {
    const address = new URL(callback)
    for (const [name, value] of Object.entries(change)) {
      address.searchParams.set(name, value)
    }
    expect((await browser.go(address.toString())).status).toBe(400)
  }
  expect(browser.cookie(site, '__Host-backoffice_session')).toBeUndefined()
})

/** Abel, signed in to backoffice. */
async function abelSignedIn(): Promise<Browser> {
  const browser = new Browser()
  await browser.go(await abelComesBack(browser))
  return browser
}

test('backoffice knows who calls by its own cookie: Abel, as auth told it', async () => {
  const browser = await abelSignedIn()

  const current = await browser.go(`${site}/backoffice/api/sign-in-sessions/current`)

  expect(current.status).toBe(200)
  expect(await current.json()).toMatchObject({ userId: abelId, endedAt: null })
  expect((await new Browser().go(`${site}/backoffice/api/sign-in-sessions/current`)).status).toBe(401)
})

test("auth's session never opens backoffice, though it is of the backoffice application", async () => {
  const browser = await abelSignedIn()
  const atAuth = browser.cookie(backofficeAtAuth, 'session_backoffice')!

  const asked = await fetch(`${site}/backoffice/api/sign-in-sessions/current`, {
    headers: { cookie: `session_backoffice=${atAuth}; __Host-backoffice_session=${atAuth}` },
  })

  expect(asked.status).toBe(401)
})

test('signing out ends both sessions: backoffice its own, and auth the one of the hint', async () => {
  const browser = await abelSignedIn()

  const signedOut = await browser.go(`${site}/backoffice/api/sign-in-sessions/current`, { method: 'DELETE' })
  const { redirectTo } = await signedOut.json() as { redirectTo: string }
  expect(new URL(redirectTo).pathname).toBe('/auth/api/oauth-authorizations/end-session')
  expect(locationOf(await browser.go(redirectTo))).toBe(`${site}/`)

  expect(browser.cookie(site, '__Host-backoffice_session')).toBeUndefined()
  expect(browser.cookie(backofficeAtAuth, 'session_backoffice')).toBeUndefined()
  expect((await browser.go(`${site}/backoffice/api/sign-in-sessions/current`)).status).toBe(401)
  // Signing in again goes through auth's sign-in: its session ended.
  const started = await browser.post(`${site}/backoffice/api/sign-in-attempts`, {})
  const { redirectTo: authorize } = await started.json() as { redirectTo: string }
  expect(new URL(locationOf(await browser.go(authorize))).pathname).toBe('/sign-in')
})

test('signing out with no session, or with one already ended, goes nowhere: an old cookie gives no id_token', async () => {
  const browser = await abelSignedIn()
  const ended = `__Host-backoffice_session=${browser.cookie(site, '__Host-backoffice_session')}`
  await browser.go(`${site}/backoffice/api/sign-in-sessions/current`, { method: 'DELETE' })

  const again = await fetch(`${site}/backoffice/api/sign-in-sessions/current`, { method: 'DELETE', headers: { cookie: ended } })
  expect(await again.json()).toEqual({ redirectTo: null })

  const signedOut = await browser.go(`${site}/backoffice/api/sign-in-sessions/current`, { method: 'DELETE' })

  expect(signedOut.status).toBe(200)
  expect(await signedOut.json()).toEqual({ redirectTo: null })
})
