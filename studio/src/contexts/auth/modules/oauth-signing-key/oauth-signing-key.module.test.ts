import type { TestContext }            from '@newt-js/core/application/testing'
import { testContext }                 from '@newt-js/core/application/testing'
import { MemoryCluster }               from '@newt-js/core/cluster/memory'
import { SqliteDatabase }              from '@newt-js/core/database/sqlite'
import { HttpRouter }                  from '@newt-js/core/http'
import { afterEach }                   from 'bun:test'
import { beforeEach }                  from 'bun:test'
import { expect }                      from 'bun:test'
import { test }                        from 'bun:test'
import { createLocalJWKSet }           from 'jose'
import { decodeProtectedHeader }       from 'jose'
import { jwtVerify }                   from 'jose'
import { join }                        from 'node:path'
// --------------------------------------------------------
import { Auth_Context }                from '../../auth.context'
import { NoSigningKey }                from './errors/no-signing-key'
import type { OauthSigningKey_Module } from './oauth-signing-key.module'
import type { OauthSigningKeyRow }     from './oauth-signing-key.repository'
import type { Jwks }                   from './oauth-signing-key.schema'

const MIGRATIONS = join(import.meta.dir, '../../migrations')
const ISSUER = 'http://backoffice.auth.test/auth/api'

let context: TestContext
let router: HttpRouter
let oauthSigningKeys: OauthSigningKey_Module

beforeEach(async () => {
  Bun.env.AUTH_SIGNING_KEYS_SECRET = Buffer.alloc(32, 7).toString('base64url')
  const database = await SqliteDatabase.open({ path: ':memory:', migrations: MIGRATIONS })
  context = testContext({ name: 'auth', cluster: new MemoryCluster(), database })
  router = new HttpRouter({ prefix: '/auth/api', database })
  router.authenticateWith(async () => null)
  oauthSigningKeys = Auth_Context.initialize(context.base, router)['oauthSigningKey']
})

afterEach(() => context.close())

async function jwksByRoute(): Promise<Jwks> {
  const response = await router.answer(new Request('http://backend.test/auth/api/oauth-signing-keys'))
  expect(response?.status).toBe(200)
  return await response!.json() as Jwks
}

test('signs nothing until auth has made its key', async () => {
  await expect(oauthSigningKeys.sign({ claims: { iss: ISSUER }, type: 'JWT' })).rejects.toThrow(NoSigningKey)
})

test('a token signed with the active key checks against the public JWKS, by its kid', async () => {
  await oauthSigningKeys.ensureActiveKey()

  const token = await oauthSigningKeys.sign({ claims: { iss: ISSUER, sub: 'abel' }, type: 'at+jwt' })

  const jwks = await jwksByRoute()
  expect(jwks.keys).toHaveLength(1)
  expect(jwks.keys[0]).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' })
  expect(decodeProtectedHeader(token)).toMatchObject({ alg: 'RS256', typ: 'at+jwt', kid: jwks.keys[0]!.kid })
  const { payload } = await jwtVerify(token, createLocalJWKSet(jwks), { issuer: ISSUER, typ: 'at+jwt' })
  expect(payload.sub).toBe('abel')
})

test('the JWKS and the table never show a private key in clear', async () => {
  await oauthSigningKeys.ensureActiveKey()

  expect(JSON.stringify(await jwksByRoute())).not.toMatch(/"(d|p|q|dp|dq|qi)":/)
  const [row] = await context.base.database.records<OauthSigningKeyRow>('oauth_signing_key').find({})
  expect(row!.privateKeyEncrypted).not.toContain('"d"')
})

test('a key made with another secret of .env signs nothing, and stops auth from starting', async () => {
  await oauthSigningKeys.ensureActiveKey()
  Bun.env.AUTH_SIGNING_KEYS_SECRET = Buffer.alloc(32, 8).toString('base64url')

  await expect(oauthSigningKeys.sign({ claims: {}, type: 'JWT' })).rejects.toThrow()
  await expect(oauthSigningKeys.ensureActiveKey()).rejects.toThrow()
})

test('starting again, or twice at once, keeps a single key', async () => {
  await Promise.all([oauthSigningKeys.ensureActiveKey(), oauthSigningKeys.ensureActiveKey()])
  await oauthSigningKeys.ensureActiveKey()

  expect((await jwksByRoute()).keys).toHaveLength(1)
})

test('verifies its own tokens, even expired, for their issuer only', async () => {
  await oauthSigningKeys.ensureActiveKey()
  const expired = await oauthSigningKeys.sign({ claims: { iss: ISSUER, exp: 1 }, type: 'JWT' })

  expect(await oauthSigningKeys.verify({ token: expired, issuer: ISSUER })).toMatchObject({ iss: ISSUER })
  expect(await oauthSigningKeys.verify({ token: expired, issuer: 'http://panel.auth.test/auth/api' })).toBeNull()
  expect(await oauthSigningKeys.verify({ token: `${expired.slice(0, -4)}AAAA`, issuer: ISSUER })).toBeNull()
  expect(await oauthSigningKeys.verify({ token: 'not a token', issuer: ISSUER })).toBeNull()
  const access = await oauthSigningKeys.sign({ claims: { iss: ISSUER }, type: 'at+jwt' })
  expect(await oauthSigningKeys.verify({ token: access, issuer: ISSUER })).toBeNull()
})
