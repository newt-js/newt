import type { TestContext }       from '@newt-js/core/application/testing'
import { testContext }            from '@newt-js/core/application/testing'
import { MemoryCluster }          from '@newt-js/core/cluster/memory'
import { SqliteDatabase }         from '@newt-js/core/database/sqlite'
import { HttpRouter }             from '@newt-js/core/http'
import { afterEach }              from 'bun:test'
import { beforeEach }             from 'bun:test'
import { expect }                 from 'bun:test'
import { test }                   from 'bun:test'
import { join }                   from 'node:path'
// --------------------------------------------------------
import { Auth_Context }           from '../../auth.context'
import type { OauthDiscoveryDTO } from './oauth-authorization.schema'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
const BACKOFFICE = 'http://backoffice.auth.test'
const ISSUER = `${BACKOFFICE}/auth/api`

let context: TestContext
let router: HttpRouter
let composed: Auth_Context

beforeEach(async () => {
  Bun.env.AUTH_APPLICATIONS_URL = 'http://auth.test'
  Bun.env.AUTH_SIGNING_KEYS_SECRET = Buffer.alloc(32, 7).toString('base64url')
  const database = await SqliteDatabase.open({ path: ':memory:', migrations: MIGRATIONS })
  context = testContext({ name: 'auth', cluster: new MemoryCluster(), database })
  router = new HttpRouter({ prefix: '/auth/api', database })
  router.authenticateWith(async () => null)
  composed = Auth_Context.initialize(context.base, router)
  await composed['oauthSigningKey'].ensureActiveKey()
  await composed['application'].create({ name: 'Backoffice' })
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
