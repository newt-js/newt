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
const emails: string[] = []

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
  await admin.post(`${site}/auth/api/users`, { applicationId: backofficeId, email: 'abel@example.com', name: 'Abel' })
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
  spyOn(console, 'log').mockImplementation((text: string) => void emails.push(text))
  backend = await startBackend(0, { data: 'memory' })
  const { port } = backend.server!
  site = `http://localhost:${port}`
  backofficeAtAuth = `http://backoffice.localhost:${port}`
  Bun.env.PUBLIC_URL = site
  Bun.env.AUTH_APPLICATIONS_URL = site
  await prepareAuth()
})

afterAll(() => backend.stop())

test('backoffice sends the browser to auth to sign in, tied to it by a cookie', async () => {
  const browser = new Browser()

  const started = await browser.post(`${site}/backoffice/api/sign-in-attempts`, {})

  expect(started.status).toBe(201)
  const { redirectTo } = await started.json() as { redirectTo: string }
  const authorize = new URL(redirectTo)
  expect(authorize.origin + authorize.pathname).toBe(`${backofficeAtAuth}/auth/api/oauth-authorizations/authorize`)
  expect(authorize.searchParams.get('state')).toBe(browser.cookie(site, 'backoffice_sign_in')!)
  expect(authorize.searchParams.get('code_challenge_method')).toBe('S256')
  // Abel has no session at auth yet: auth asks to sign in, and comes back to /authorize after.
  const signIn = new URL(locationOf(await browser.go(redirectTo)))
  expect(signIn.origin + signIn.pathname).toBe(`${backofficeAtAuth}/sign-in`)
  expect(signIn.searchParams.get('return_to')).toBe(redirectTo)
})
