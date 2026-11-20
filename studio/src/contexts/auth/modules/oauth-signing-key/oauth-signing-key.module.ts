import { Module }                        from '@newt-js/core'
import { UseCase }                       from '@newt-js/core'
import { eventsOf }                      from '@newt-js/core'
import type { ContextBase }              from '@newt-js/core/application'
import type { HttpRouter }               from '@newt-js/core/http'
import type { JWTPayload }               from 'jose'
import { SignJWT }                       from 'jose'
import { compactVerify }                 from 'jose'
import { createLocalJWKSet }             from 'jose'
import { decodeJwt }                     from 'jose'
import { exportJWK }                     from 'jose'
import { generateKeyPair }               from 'jose'
import { importJWK }                     from 'jose'
// --------------------------------------------------------
import { NoSigningKey }                  from './errors/no-signing-key'
import { OauthSigningKey_Created }       from './events/oauth-signing-key-created'
import { OauthSigningKey }               from './oauth-signing-key'
import { OauthSigningKey_Repository }    from './oauth-signing-key.repository'
import { registerOauthSigningKeyRoutes } from './oauth-signing-key.routes'
import type { Jwks }                     from './oauth-signing-key.schema'
import type { OauthSigningKeySignDTO }   from './oauth-signing-key.schema'
import { OauthSigningKeySignSchema }     from './oauth-signing-key.schema'
import type { OauthSigningKeyVerifyDTO } from './oauth-signing-key.schema'
import { OauthSigningKeyVerifySchema }   from './oauth-signing-key.schema'
import type { PublicJwk }                from './oauth-signing-key.schema'
import { decryptPrivateKey }             from './services/key-encryption'
import { encryptPrivateKey }             from './services/key-encryption'
import { OauthSigningKeyId }             from './value-objects/oauth-signing-key-id'

/** RS256: the one every OpenID client must accept. */
const ALGORITHM = 'RS256'

/** Two first keys made at once: the second is undone, and the first one used. */
class KeyAlreadyMade extends Error {}

/** The keys that sign auth's tokens. Only this module ever reads a private key. */
export class OauthSigningKey_Module extends Module {

  static initialize(base: ContextBase, router: HttpRouter): OauthSigningKey_Module {
    const repository = new OauthSigningKey_Repository(base)
    const module = new OauthSigningKey_Module(base, repository, router)
    return module
  }

  readonly events
  readonly routes

  private constructor(
    base: ContextBase,
    private readonly repository: OauthSigningKey_Repository,
    router: HttpRouter,
  ) {
    super('oauthSigningKey', base.useCaseRunner)
    this.events = eventsOf(base.bus, {
      created: OauthSigningKey_Created,
    })
    this.routes = registerOauthSigningKeyRoutes(router, this)
  }

  /** Makes the first key if there is none. Run when auth starts: signing a token never writes. */
  @UseCase()
  async ensureActiveKey(): Promise<void> {
    if (await this.activeKey()) {
      return
    }
    const { publicKey, privateKey } = await generateKeyPair(ALGORITHM, { extractable: true })
    const id = OauthSigningKeyId.from(Bun.randomUUIDv7())
    const publicJwk = { ...await exportJWK(publicKey), alg: ALGORITHM, use: 'sig', kid: id } as PublicJwk
    const key = OauthSigningKey.generate({ id, publicJwk, privateKeyEncrypted: await encryptPrivateKey(await exportJWK(privateKey)) })
    try {
      // Two instances starting at once: the guard lines them up, and the second leaves the first key.
      await this.repository.persist(key, {
        guard: ['auth.oauthSigningKey.first'],
        after: async () => {
          if ((await this.repository.find({ retiredAt: null }, { limit: 2 })).length > 1) {
            throw new KeyAlreadyMade()
          }
        },
      })
    } catch (error) {
      if (!(error instanceof KeyAlreadyMade)) {
        throw error
      }
    }
  }

  /** A token signed with the active key, its `kid` in the header. */
  @UseCase()
  async sign(input: OauthSigningKeySignDTO): Promise<string> {
    const { claims, type } = OauthSigningKeySignSchema.parse(input)
    const key = await this.activeKey()
    if (!key) {
      throw new NoSigningKey()
    }
    const privateKey = await importJWK(await decryptPrivateKey(key.privateKeyEncrypted), ALGORITHM)
    return new SignJWT(claims as JWTPayload)
      .setProtectedHeader({ alg: ALGORITHM, typ: type, kid: key.toDTO().id })
      .sign(privateKey)
  }

  /** The claims of a token signed by one of these keys for that issuer, even expired; of any other, null. */
  @UseCase()
  async verify(input: OauthSigningKeyVerifyDTO): Promise<JWTPayload | null> {
    const parsed = OauthSigningKeyVerifySchema.safeParse(input)
    if (!parsed.success) {
      return null
    }
    try {
      await compactVerify(parsed.data.token, createLocalJWKSet(await this.jwks()), { algorithms: [ALGORITHM] })
      const claims = decodeJwt(parsed.data.token)
      return claims.iss === parsed.data.issuer ? claims : null
    } catch {
      return null
    }
  }

  /** The public keys still in use, as `jwks_uri` gives them. */
  @UseCase()
  async jwks(): Promise<Jwks> {
    const keys = await this.repository.find({ retiredAt: null }, { orderBy: [{ field: 'createdAt', direction: 'desc' }] })
    return { keys: keys.map(each => each.toDTO().publicJwk) }
  }

  /** The newest key not retired. */
  private async activeKey(): Promise<OauthSigningKey | undefined> {
    const [key] = await this.repository.find({ retiredAt: null }, { orderBy: [{ field: 'createdAt', direction: 'desc' }], limit: 1 })
    return key
  }

}
