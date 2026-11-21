import type { TestContext }           from '@newt-js/core/application/testing'
import { testContext }                from '@newt-js/core/application/testing'
import { MemoryCluster }              from '@newt-js/core/cluster/memory'
import { SqliteDatabase }             from '@newt-js/core/database/sqlite'
import { HttpRouter }                 from '@newt-js/core/http'
import { afterEach }                  from 'bun:test'
import { beforeEach }                 from 'bun:test'
import { expect }                     from 'bun:test'
import { test }                       from 'bun:test'
import type { JSONWebKeySet }         from 'jose'
import { createLocalJWKSet }          from 'jose'
import { jwtVerify }                  from 'jose'
import { join }                       from 'node:path'
// --------------------------------------------------------
import { Auth_Context }               from '../../auth.context'
import type { OauthAuthorizationRow } from './oauth-authorization.repository'
import type { OauthDiscoveryDTO }     from './oauth-authorization.schema'
import type { OauthTokensDTO }        from './oauth-authorization.schema'

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

/** A code for Abel, given to backoffice's client, and what the client keeps to exchange it. */
async function codeForAbel(scope = 'openid email') {
  const client = await backofficeClient()
  const { abelId, cookie } = await abelSignedIn()
  const { verifier, challenge } = pkce()
  const { location } = await authorize(authorizeQuery(client.id, challenge, { scope }), cookie)
  return { client, abelId, verifier, code: location!.searchParams.get('code')! }
}

function exchange(form: Record<string, string>, client?: { id: string, secret: string }, issuer = ISSUER) {
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' }
  if (client) {
    headers.authorization = `Basic ${btoa(`${client.id}:${client.secret}`)}`
  }
  return router.answer(new Request(`${issuer}/oauth-authorizations/token`, {
    method: 'POST',
    headers,
    body: new URLSearchParams(form).toString(),
  }))
}

function exchangeForm(code: string, verifier: string, overrides: Record<string, string> = {}) {
  return { grant_type: 'authorization_code', code, redirect_uri: CALLBACK, code_verifier: verifier, ...overrides }
}

async function jwksOf(): Promise<ReturnType<typeof createLocalJWKSet>> {
  return createLocalJWKSet(await (await get(`${ISSUER}/oauth-signing-keys`))!.json() as JSONWebKeySet)
}

test('the whole flow: the code, with its verifier and the client secret, gives an id_token and an access token', async () => {
  const { client, abelId, verifier, code } = await codeForAbel()

  const response = await exchange(exchangeForm(code, verifier), client)

  expect(response?.status).toBe(200)
  expect(response?.headers.get('cache-control')).toBe('no-store')
  const tokens = await response!.json() as OauthTokensDTO
  expect(tokens).toMatchObject({ token_type: 'Bearer', expires_in: 300, scope: 'openid email' })
  expect(tokens).not.toHaveProperty('refresh_token')
  const jwks = await jwksOf()
  const id = await jwtVerify(tokens.id_token, jwks, { issuer: ISSUER, audience: client.id, currentDate: context.clock.now() })
  expect(id.payload).toMatchObject({
    sub: abelId,
    nonce: 'the nonce',
    amr: ['password'],
    email: 'abel@example.com',
    email_verified: false,
  })
  expect(id.payload.exp! - id.payload.iat!).toBe(300)
  const access = await jwtVerify(tokens.access_token, jwks, { issuer: ISSUER, audience: BACKOFFICE, typ: 'at+jwt', currentDate: context.clock.now() })
  expect(access.payload).toMatchObject({ sub: abelId, client_id: client.id, scope: 'openid email', amr: ['password'] })
})

test('the secret may come in the form too, and without the email scope the id_token has no email', async () => {
  const { client, verifier, code } = await codeForAbel('openid')

  const response = await exchange(exchangeForm(code, verifier, { client_id: client.id, client_secret: client.secret }))

  const tokens = await response!.json() as OauthTokensDTO
  const id = await jwtVerify(tokens.id_token, await jwksOf(), { issuer: ISSUER, audience: client.id, currentDate: context.clock.now() })
  expect(id.payload).not.toHaveProperty('email')
})

test('a code works once: the second exchange is refused', async () => {
  const { client, verifier, code } = await codeForAbel()
  await exchange(exchangeForm(code, verifier), client)

  const again = await exchange(exchangeForm(code, verifier), client)

  expect(again?.status).toBe(400)
  expect(await again!.json()).toMatchObject({ error: 'invalid_grant' })
})

test('two exchanges of one code at once give tokens once', async () => {
  const { client, verifier, code } = await codeForAbel()

  const answers = await Promise.all([1, 2].map(() => exchange(exchangeForm(code, verifier), client)))

  expect(answers.map(each => each?.status).sort()).toEqual([200, 400])
})

test.each([
  ['a wrong verifier', { code_verifier: pkce().verifier }],
  ['no verifier', { code_verifier: '' }],
  ['another redirect_uri', { redirect_uri: 'http://localhost:4000/other' }],
  ['a code it never gave', { code: 'not a code' }],
])('%s is an invalid grant', async (_, overrides) => {
  const { client, verifier, code } = await codeForAbel()

  const response = await exchange(exchangeForm(code, verifier, overrides), client)

  expect(response?.status).toBe(400)
  expect(await response!.json()).toMatchObject({ error: 'invalid_grant' })
})

test('a code expires in a minute', async () => {
  const { client, verifier, code } = await codeForAbel()
  context.clock.advance(61 * 1000)

  const response = await exchange(exchangeForm(code, verifier), client)

  expect(await response!.json()).toMatchObject({ error: 'invalid_grant' })
})

test('a client that cannot prove itself, or of another client or application, gets nothing', async () => {
  const { client, verifier, code } = await codeForAbel()
  const other = await backofficeClient()
  const form = exchangeForm(code, verifier)

  const noSecret = await exchange(form)
  expect(noSecret?.status).toBe(401)
  expect(noSecret?.headers.get('www-authenticate')).toContain('Basic')
  expect(await noSecret!.json()).toMatchObject({ error: 'invalid_client' })
  expect((await exchange(form, { ...client, secret: other.secret }))?.status).toBe(401)
  expect(await (await exchange(form, other))!.json()).toMatchObject({ error: 'invalid_grant' })
  expect((await exchange(form, client, 'http://auth.auth.test/auth/api'))?.status).toBe(401)
  expect((await exchange({ ...form, grant_type: 'password' }, client))?.status).toBe(400)
  // None of those spent the code.
  expect((await exchange(form, client))?.status).toBe(200)
})

/** Abel signed in to backoffice through its client, and the id_token it got. */
async function abelWithIdToken() {
  const client = await backofficeClient()
  const { cookie } = await abelSignedIn()
  const { verifier, challenge } = pkce()
  const { location } = await authorize(authorizeQuery(client.id, challenge), cookie)
  const tokens = await (await exchange(exchangeForm(location!.searchParams.get('code')!, verifier), client))!.json() as OauthTokensDTO
  return { client, cookie, idToken: tokens.id_token }
}

function endSession(query: Record<string, string>, cookie: string) {
  return get(`${ISSUER}/oauth-authorizations/end-session?${new URLSearchParams(query)}`, { cookie })
}

async function isSignedIn(clientId: string, cookie: string): Promise<boolean> {
  const { location } = await authorize(authorizeQuery(clientId, pkce().challenge), cookie)
  return location!.searchParams.has('code')
}

test('signing out ends the session of the application, and goes back to a registered address', async () => {
  const { client, cookie, idToken } = await abelWithIdToken()

  const query = { id_token_hint: idToken, post_logout_redirect_uri: 'http://localhost:4000/', state: 'bye' }
  const response = await endSession(query, cookie)

  expect(response?.status).toBe(302)
  expect(response?.headers.get('location')).toBe('http://localhost:4000/?state=bye')
  expect(response?.headers.get('set-cookie')).toMatch(/^session_backoffice=;.*Max-Age=0/i)
  expect(await isSignedIn(client.id, cookie)).toBe(false)
})

test('without an address to go back to, it signs out and stays', async () => {
  const { client, cookie, idToken } = await abelWithIdToken()

  const response = await endSession({ id_token_hint: idToken }, cookie)

  expect(response?.status).toBe(200)
  expect(await isSignedIn(client.id, cookie)).toBe(false)
})

test('a link from anywhere signs no one out: without a hint, or with an access token, or with the hint of someone else', async () => {
  const { client, cookie, idToken } = await abelWithIdToken()
  const access = await (async () => {
    const { verifier, challenge } = pkce()
    const { location } = await authorize(authorizeQuery(client.id, challenge), cookie)
    const tokens = await exchange(exchangeForm(location!.searchParams.get('code')!, verifier), client)
    return (await tokens!.json() as OauthTokensDTO).access_token
  })()
  const eva = await composed['user'].grantAccess({ applicationId: backofficeId, email: 'eva@example.com', name: 'Eva' })
  const evasHint = await composed['oauthSigningKey'].sign({ claims: { iss: ISSUER, sub: eva.id, aud: client.id }, type: 'JWT' })

  expect((await endSession({}, cookie))?.status).toBe(400)
  expect((await endSession({ id_token_hint: access }, cookie))?.status).toBe(400)
  expect((await endSession({ id_token_hint: evasHint }, cookie))?.status).toBe(200)

  expect(await isSignedIn(client.id, cookie)).toBe(true)
  expect((await endSession({ id_token_hint: idToken }, cookie))?.status).toBe(200)
  expect(await isSignedIn(client.id, cookie)).toBe(false)
})

test('prompt=login, or a session older than max_age, signs in again, and comes back without asking it twice', async () => {
  const client = await backofficeClient()
  const { cookie } = await abelSignedIn()
  context.clock.advance(10 * 60 * 1000)
  const { challenge } = pkce()

  for (const overrides of [{ prompt: 'login' }, { max_age: '60' }]) {
    const { location } = await authorize(authorizeQuery(client.id, challenge, overrides), cookie)
    expect(location!.pathname).toBe('/sign-in')
    const back = new URL(location!.searchParams.get('return_to')!)
    expect(back.searchParams.has('prompt') || back.searchParams.has('max_age')).toBe(false)
  }
  const fresh = await authorize(authorizeQuery(client.id, challenge, { max_age: '3600' }), cookie)
  expect(fresh.location!.searchParams.has('code')).toBe(true)
  const silent = await authorize(authorizeQuery(client.id, challenge, { prompt: 'none', max_age: '60' }), cookie)
  expect(silent.location!.searchParams.get('error')).toBe('login_required')
})

test('a parameter twice, or a client proving itself twice, is refused', async () => {
  const { client, verifier, code } = await codeForAbel()

  const twice = await authorize(`${authorizeQuery(client.id, pkce().challenge)}&redirect_uri=${encodeURIComponent(CALLBACK)}`)
  expect(twice.status).toBe(400)
  const both = await exchange(exchangeForm(code, verifier, { client_secret: 'wrong' }), client)
  expect(both?.status).toBe(400)
  expect(await both!.json()).toMatchObject({ error: 'invalid_request' })
})

test('request objects are not supported, and an overlong state is never echoed', async () => {
  const client = await backofficeClient()
  const { challenge } = pkce()

  const request = await authorize(authorizeQuery(client.id, challenge, { request: 'a.b.c' }))
  expect(request.location!.searchParams.get('error')).toBe('request_not_supported')
  const long = await authorize(authorizeQuery(client.id, challenge, { state: 'x'.repeat(501) }))
  expect(long.location!.searchParams.get('error')).toBe('invalid_request')
  expect(long.location!.searchParams.has('state')).toBe(false)
})

test('an address the client does not have, or a hint this auth never signed, is refused, and nothing ends', async () => {
  const { client, cookie, idToken } = await abelWithIdToken()
  const forged = `${idToken.slice(0, -4)}AAAA`
  const refused: Record<string, string>[] = [
    { id_token_hint: idToken, post_logout_redirect_uri: 'https://evil.test/' },
    { client_id: client.id, post_logout_redirect_uri: CALLBACK },
    { post_logout_redirect_uri: 'http://localhost:4000/' },
    { id_token_hint: forged },
    { id_token_hint: idToken, client_id: Bun.randomUUIDv7(), post_logout_redirect_uri: 'http://localhost:4000/' },
  ]

  for (const query of refused) {
    const response = await endSession(query, cookie)
    expect(response?.status).toBe(400)
    expect(response?.headers.get('location')).toBeNull()
  }
  expect(await isSignedIn(client.id, cookie)).toBe(true)
})

test('an id_token_hint of another application is no hint here', async () => {
  const { cookie, idToken } = await abelWithIdToken()

  const response = await get(`http://auth.auth.test/auth/api/oauth-authorizations/end-session?id_token_hint=${idToken}`, { cookie })

  expect(response?.status).toBe(400)
})

function userInfo(accessToken: string, issuer = ISSUER) {
  return router.answer(new Request(`${issuer}/oauth-authorizations/userinfo`, { headers: { authorization: `Bearer ${accessToken}` } }))
}

test('UserInfo tells who the access token is of, by its scopes', async () => {
  const { client, abelId, verifier, code } = await codeForAbel('openid email')
  const tokens = await (await exchange(exchangeForm(code, verifier), client))!.json() as OauthTokensDTO

  const response = await userInfo(tokens.access_token)

  expect(response?.status).toBe(200)
  expect(await response!.json()).toEqual({ sub: abelId, email: 'abel@example.com', email_verified: false })
  const discovery = await (await get(`${ISSUER}/.well-known/openid-configuration`))!.json() as OauthDiscoveryDTO
  expect(discovery.userinfo_endpoint).toBe(`${ISSUER}/oauth-authorizations/userinfo`)
})

test('UserInfo refuses an id_token, an expired token, a token of another application, and none', async () => {
  const { client, verifier, code } = await codeForAbel()
  const tokens = await (await exchange(exchangeForm(code, verifier), client))!.json() as OauthTokensDTO

  for (const refused of [
    await userInfo(tokens.id_token),
    await userInfo(tokens.access_token, 'http://auth.auth.test/auth/api'),
    await userInfo(''),
  ]) {
    expect(refused?.status).toBe(401)
    expect(refused?.headers.get('www-authenticate')).toContain('invalid_token')
  }
  context.clock.advance(5 * 60 * 1000)
  expect((await userInfo(tokens.access_token))?.status).toBe(401)
})
