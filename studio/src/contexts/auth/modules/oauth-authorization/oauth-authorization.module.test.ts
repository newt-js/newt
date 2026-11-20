import type { TestContext }           from '@newt-js/core/application/testing'
import { testContext }                from '@newt-js/core/application/testing'
import { MemoryCluster }              from '@newt-js/core/cluster/memory'
import { SqliteDatabase }             from '@newt-js/core/database/sqlite'
import { HttpRouter }                 from '@newt-js/core/http'
import { afterEach }                  from 'bun:test'
import { beforeEach }                 from 'bun:test'
import { expect }                     from 'bun:test'
import { test }                       from 'bun:test'
import { join }                       from 'node:path'
// --------------------------------------------------------
import { Auth_Context }               from '../../auth.context'
import type { OauthAuthorizationRow } from './oauth-authorization.repository'
import type { OauthDiscoveryDTO }     from './oauth-authorization.schema'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
const BACKOFFICE = 'http://backoffice.auth.test'
const ISSUER = `${BACKOFFICE}/auth/api`

let context: TestContext
let router: HttpRouter
let composed: Auth_Context
let backofficeId: string

beforeEach(async () => {
  Bun.env.AUTH_APPLICATIONS_URL = 'http://auth.test'
  Bun.env.AUTH_SIGNING_KEYS_SECRET = Buffer.alloc(32, 7).toString('base64url')
  const database = await SqliteDatabase.open({ path: ':memory:', migrations: MIGRATIONS })
  context = testContext({ name: 'auth', cluster: new MemoryCluster(), database })
  router = new HttpRouter({ prefix: '/auth/api', database })
  router.authenticateWith(async () => null)
  composed = Auth_Context.initialize(context.base, router)
  await composed['oauthSigningKey'].ensureActiveKey()
  backofficeId = (await composed['application'].create({ name: 'Backoffice' })).id
})

afterEach(() => context.close())

function get(url: string, headers: Record<string, string> = {}) {
  return router.answer(new Request(url, { headers }))
}

test('each application has its own OpenID configuration, at its issuer', async () => {
  const response = await get(`${ISSUER}/.well-known/openid-configuration`)

  expect(response?.status).toBe(200)
  const discovery = await response!.json() as OauthDiscoveryDTO
  expect(discovery).toMatchObject({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth-authorizations/authorize`,
    token_endpoint: `${ISSUER}/oauth-authorizations/token`,
    jwks_uri: `${ISSUER}/oauth-signing-keys`,
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
    id_token_signing_alg_values_supported: ['RS256'],
  })
  const auth = await get('http://auth.auth.test/auth/api/.well-known/openid-configuration')
  expect(await auth!.json()).toMatchObject({ issuer: 'http://auth.auth.test/auth/api' })
})

test('the host says the application, never the request: no configuration where there is none', async () => {
  expect((await get('http://panel.auth.test/auth/api/.well-known/openid-configuration'))?.status).toBe(404)
  expect((await get('http://auth.test/auth/api/.well-known/openid-configuration'))?.status).toBe(404)
  const forged = await get(`${ISSUER}/.well-known/openid-configuration`, { host: 'evil.test' })
  expect(forged?.status).toBe(404)
})

test('the jwks_uri of the configuration gives the keys', async () => {
  const discovery = await (await get(`${ISSUER}/.well-known/openid-configuration`))!.json() as OauthDiscoveryDTO

  const jwks = await get(discovery.jwks_uri)

  expect(await jwks!.json()).toMatchObject({ keys: [{ kty: 'RSA', alg: 'RS256' }] })
})

const CALLBACK = 'http://localhost:4000/callback'
const PASSWORD = 'correct horse battery staple'

/** A client of backoffice, as its backend keeps it. */
async function backofficeClient(applicationId = backofficeId): Promise<{ id: string, secret: string }> {
  const { client, secret } = await composed['applicationClient'].register({
    applicationId,
    name: 'Backoffice backend',
    redirectUris: [CALLBACK],
    postLogoutRedirectUris: ['http://localhost:4000/'],
  })
  return { id: client.id, secret }
}

/** Abel, with access to backoffice and its password: the cookie of its session there once it signed in. */
async function abelSignedIn(): Promise<{ abelId: string, cookie: string }> {
  const abel = await composed['user'].grantAccess({ applicationId: backofficeId, email: 'abel@example.com', name: 'Abel' })
  await composed['userCredential'].setPassword({ userId: abel.id, password: PASSWORD })
  const attempts = composed['signInAttempt']
  const started = await attempts.start({ applicationId: backofficeId, email: 'abel@example.com' })
  await attempts.answerStep({ attemptId: started.id, step: 'password', answer: PASSWORD })
  const { token } = await composed['signInSession'].open({ attemptId: started.id })
  return { abelId: abel.id, cookie: `session_backoffice=${token}` }
}

/** A PKCE pair: the verifier the client keeps, and the challenge it sends. */
function pkce(): { verifier: string, challenge: string } {
  const verifier = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
  const challenge = new Bun.CryptoHasher('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function authorizeQuery(clientId: string, challenge: string, overrides: Record<string, string | undefined> = {}) {
  const query = {
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CALLBACK,
    scope: 'openid email',
    state: 'the state',
    nonce: 'the nonce',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...overrides,
  }
  const given = Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined)
  return new URLSearchParams(given).toString()
}

async function authorize(query: string, cookie?: string): Promise<{ status: number | undefined, location: URL | null }> {
  const response = await get(`${ISSUER}/oauth-authorizations/authorize?${query}`, cookie ? { cookie } : {})
  const location = response?.headers.get('location')
  return { status: response?.status, location: location ? new URL(location) : null }
}

test('with a session of the application, the browser goes back to the client with a code', async () => {
  const client = await backofficeClient()
  const { abelId, cookie } = await abelSignedIn()

  const { status, location } = await authorize(authorizeQuery(client.id, pkce().challenge), cookie)

  expect(status).toBe(302)
  expect(`${location!.origin}${location!.pathname}`).toBe(CALLBACK)
  expect(location!.searchParams.get('state')).toBe('the state')
  expect(location!.searchParams.get('iss')).toBe(ISSUER)
  const code = location!.searchParams.get('code')!
  expect(code.length).toBeGreaterThanOrEqual(43)
  const rows = await context.base.database.records<OauthAuthorizationRow>('oauth_authorization').find({})
  expect(rows).toMatchObject([{ userId: abelId, clientId: client.id, nonce: 'the nonce', amr: ['password'] }])
  expect(JSON.stringify(rows)).not.toContain(code)
})

test('without a session, the browser goes to sign in to the application, and comes back', async () => {
  const client = await backofficeClient()
  const query = authorizeQuery(client.id, pkce().challenge)

  const { status, location } = await authorize(query)

  expect(status).toBe(302)
  expect(`${location!.origin}${location!.pathname}`).toBe(`${BACKOFFICE}/sign-in`)
  const back = new URL(location!.searchParams.get('return_to')!)
  expect(`${back.origin}${back.pathname}`).toBe(`${ISSUER}/oauth-authorizations/authorize`)
  expect(back.searchParams.get('code_challenge')).toBe(new URLSearchParams(query).get('code_challenge'))
  expect(await context.base.database.records<OauthAuthorizationRow>('oauth_authorization').find({})).toEqual([])
})

test('a session of another application is no session here', async () => {
  const client = await backofficeClient()
  const { cookie } = await abelSignedIn()

  const { location } = await authorize(authorizeQuery(client.id, pkce().challenge), cookie.replace('session_backoffice', 'session_auth'))

  expect(location!.pathname).toBe('/sign-in')
})

test('an unknown client or redirect_uri is shown an error, never sent anywhere', async () => {
  const client = await backofficeClient()
  const ofAuth = await backofficeClient('01a1f4f7-41e3-755d-adb7-298eb0bc0198')
  const { cookie } = await abelSignedIn()
  const { challenge } = pkce()

  for (const query of [
    authorizeQuery(Bun.randomUUIDv7(), challenge),
    authorizeQuery('not an id', challenge),
    authorizeQuery(client.id, challenge, { redirect_uri: 'http://localhost:4000/callback/' }),
    authorizeQuery(client.id, challenge, { redirect_uri: 'https://evil.test/callback' }),
    authorizeQuery(client.id, challenge, { redirect_uri: undefined }),
    authorizeQuery(ofAuth.id, challenge),
  ]) {
    const { status, location } = await authorize(query, cookie)
    expect(status).toBe(400)
    expect(location).toBeNull()
  }
})

test.each([
  [{ code_challenge: undefined }, 'invalid_request'],
  [{ code_challenge_method: 'plain' }, 'invalid_request'],
  [{ code_challenge: 'short' }, 'invalid_request'],
  [{ response_type: 'token' }, 'unsupported_response_type'],
  [{ scope: 'email' }, 'invalid_scope'],
])('a request without code + PKCE goes back to the client with an error: %o', async (overrides, error) => {
  const client = await backofficeClient()
  const { cookie } = await abelSignedIn()

  const { status, location } = await authorize(authorizeQuery(client.id, pkce().challenge, overrides), cookie)

  expect(status).toBe(302)
  expect(location!.searchParams.get('error')).toBe(error)
  expect(location!.searchParams.get('state')).toBe('the state')
  expect(location!.searchParams.get('code')).toBeNull()
})

test('a request without a state goes back with an error, and prompt=none without a session too', async () => {
  const client = await backofficeClient()
  const { challenge } = pkce()

  const stateless = await authorize(authorizeQuery(client.id, challenge, { state: undefined }))
  expect(stateless.location!.searchParams.get('error')).toBe('invalid_request')
  const silent = await authorize(authorizeQuery(client.id, challenge, { prompt: 'none' }))
  expect(silent.location!.searchParams.get('error')).toBe('login_required')
  expect(silent.location!.searchParams.get('state')).toBe('the state')
})
