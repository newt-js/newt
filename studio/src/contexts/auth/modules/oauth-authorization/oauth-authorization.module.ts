import { Module }                               from '@newt-js/core'
import { StaleVersion }                         from '@newt-js/core'
import { UseCase }                              from '@newt-js/core'
import { eventsOf }                             from '@newt-js/core'
import type { ContextBase }                     from '@newt-js/core/application'
import type { HttpRouter }                      from '@newt-js/core/http'
// --------------------------------------------------------
import type { ApplicationClientDTO }            from '../application-client/application-client.schema'
import type { UserDTO }                         from '../user/user.schema'
import { InvalidAuthorizationRequest }          from './errors/invalid-authorization-request'
import { InvalidClient }                        from './errors/invalid-client'
import { InvalidGrant }                         from './errors/invalid-grant'
import { InvalidToken }                         from './errors/invalid-token'
import { UnsupportedGrantType }                 from './errors/unsupported-grant-type'
import { OauthAuthorization_Created }           from './events/oauth-authorization-created'
import { OauthAuthorization }                   from './oauth-authorization'
import type { OauthAuthorization_Deps }         from './oauth-authorization.deps'
import { OauthAuthorization_Repository }        from './oauth-authorization.repository'
import { registerOauthAuthorizationRoutes }     from './oauth-authorization.routes'
import type { OauthAuthorizationAuthorizeDTO }  from './oauth-authorization.schema'
import { OauthAuthorizationAuthorizeSchema }    from './oauth-authorization.schema'
import type { OauthAuthorizationDTO }           from './oauth-authorization.schema'
import type { OauthAuthorizationEndSessionDTO } from './oauth-authorization.schema'
import { OauthAuthorizationEndSessionSchema }   from './oauth-authorization.schema'
import type { OauthAuthorizationExchangeDTO }   from './oauth-authorization.schema'
import { OauthAuthorizationExchangeSchema }     from './oauth-authorization.schema'
import type { OauthAuthorizationRedirectDTO }   from './oauth-authorization.schema'
import type { OauthAuthorizationUserInfoDTO }   from './oauth-authorization.schema'
import { OauthAuthorizationUserInfoSchema }     from './oauth-authorization.schema'
import type { OauthDiscoveryDTO }               from './oauth-authorization.schema'
import type { OauthEndSessionDTO }              from './oauth-authorization.schema'
import type { OauthTokensDTO }                  from './oauth-authorization.schema'
import type { OauthUserInfoDTO }                from './oauth-authorization.schema'
import { ApplicationClientId }                  from './value-objects/application-client-id'
import { UserId }                               from './value-objects/user-id'

/** Codes are long and random: SHA-256 is enough, as for the tokens of sessions. */
function hashOf(code: string): string {
  return new Bun.CryptoHasher('sha256').update(code).digest('hex')
}

/** Tokens are used and thrown away: five minutes, so taking access away takes five minutes at most. */
const TOKEN_LIFETIME_S = 5 * 60

/** The scopes this auth knows, of those asked; unknown ones are left out, as OAuth allows. */
const SCOPES = ['openid', 'email', 'profile']

function scopesOf(scope: string): string[] {
  return [...new Set(scope.split(' ').filter(each => SCOPES.includes(each)))]
}

/** A PKCE challenge: the base64url SHA-256 of the verifier the client keeps. */
const CODE_CHALLENGE = /^[\w-]{43}$/

/** The longest state echoed back. */
const MOST_STATE_LENGTH = 500

/** Whether the client asks to sign in again: with prompt=login, or by max_age when the session is older. */
function mustSignInAgain(query: Record<string, string>, signedInAt: string, now: Date): boolean {
  const maxAge = /^\d+$/.test(query.max_age ?? '') ? Number(query.max_age) : null
  const ageSeconds = (now.getTime() - Date.parse(signedInAt)) / 1000
  return (query.prompt ?? '').split(' ').includes('login') || (maxAge !== null && ageSeconds > maxAge)
}

/** What is wrong with a request once its client is known, as an OAuth error; nothing when it can go on. */
function problemOf(query: Record<string, string>): { error: string, error_description: string } | null {
  const invalid = (error_description: string) => ({ error: 'invalid_request', error_description })
  if (query.response_type !== 'code') {
    return { error: 'unsupported_response_type', error_description: 'Only response_type=code' }
  }
  if (!scopesOf(query.scope ?? '').includes('openid')) {
    return { error: 'invalid_scope', error_description: 'The scope must have openid' }
  }
  if (query.code_challenge_method !== 'S256' || !CODE_CHALLENGE.test(query.code_challenge ?? '')) {
    return invalid('PKCE is required: a code_challenge with code_challenge_method=S256')
  }
  if (query.request !== undefined) {
    return { error: 'request_not_supported', error_description: 'Request objects are not supported' }
  }
  if (query.request_uri !== undefined) {
    return { error: 'request_uri_not_supported', error_description: 'request_uri is not supported' }
  }
  if (!query.state || query.state.length > MOST_STATE_LENGTH) {
    return invalid('A state is required')
  }
  if ((query.nonce ?? '').length > MOST_STATE_LENGTH) {
    return invalid('The nonce is too long')
  }
  return null
}

/** An address with these parameters added to its query: a redirect_uri may already have one. */
function withQuery(address: string, params: Record<string, string>): string {
  const url = new URL(address)
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value)
  }
  return url.href
}

/** OpenID Connect for each application: code + PKCE only, as OAuth 2.1 asks. */
export class OauthAuthorization_Module extends Module {

  static initialize(base: ContextBase, router: HttpRouter, deps: OauthAuthorization_Deps): OauthAuthorization_Module {
    const repository = new OauthAuthorization_Repository(base, deps)
    const module = new OauthAuthorization_Module(base, repository, router, deps)
    return module
  }

  readonly events
  readonly routes
  /** Where auth's routes are: an application's issuer is its address and this path. */
  private readonly prefix: string

  private constructor(
    private readonly base: ContextBase,
    private readonly repository: OauthAuthorization_Repository,
    router: HttpRouter,
    private readonly deps: OauthAuthorization_Deps,
  ) {
    super('oauthAuthorization', base.useCaseRunner, deps)
    this.prefix = router.prefix
    this.events = eventsOf(base.bus, {
      created: OauthAuthorization_Created,
    })
    this.routes = registerOauthAuthorizationRoutes(router, this, { rateLimits: base.rateLimits, signInSessions: deps.signInSession })
  }

  /** The OpenID configuration of the application at a host: each one has its own issuer. */
  @UseCase()
  async discovery(host: string): Promise<OauthDiscoveryDTO> {
    const issuer = await this.issuerAt(host)
    return {
      issuer,
      authorization_endpoint: `${issuer}/oauth-authorizations/authorize`,
      token_endpoint: `${issuer}/oauth-authorizations/token`,
      jwks_uri: `${issuer}/oauth-signing-keys`,
      end_session_endpoint: `${issuer}/oauth-authorizations/end-session`,
      userinfo_endpoint: `${issuer}/oauth-authorizations/userinfo`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'email', 'profile'],
      claims_supported: ['iss', 'sub', 'aud', 'exp', 'iat', 'auth_time', 'nonce', 'amr', 'email', 'email_verified', 'name'],
      authorization_response_iss_parameter_supported: true,
    }
  }

  /**
   * Checks a request to /authorize. A client or redirect_uri it does not know is an error shown here: never sent back to
   * an address that may not be the client's. Anything else wrong goes back to the client, as OAuth says. Without a
   * session of the application, the browser goes to sign in, and comes back here.
   */
  @UseCase()
  async authorize(input: OauthAuthorizationAuthorizeDTO): Promise<OauthAuthorizationRedirectDTO> {
    const { host, cookies, query } = OauthAuthorizationAuthorizeSchema.parse(input)
    const { application, url } = await this.deps.application.fromHost(host)
    const issuer = `${url}${this.prefix}`
    const client = await this.clientOf(query.client_id)
    const redirectUri = query.redirect_uri ?? ''
    if (client.application.id !== application.id || !client.redirectUris.some(each => each === redirectUri)) {
      throw new InvalidAuthorizationRequest()
    }
    // A state too long is not echoed: it goes back only as the client sent it, and valid.
    const state: Record<string, string> = query.state !== undefined && query.state.length <= MOST_STATE_LENGTH ? { state: query.state } : {}
    const back = (params: Record<string, string>) => ({ redirectTo: withQuery(redirectUri, { ...params, ...state, iss: issuer }) })
    const problem = problemOf(query)
    if (problem) {
      return back(problem)
    }
    const session = await this.deps.signInSession.current({ cookies, applicationSlug: application.slug })
    const now = this.base.clock.now()
    if (!session || mustSignInAgain(query, session.createdAt, now)) {
      if (query.prompt === 'none') {
        return back({ error: 'login_required', error_description: 'Signing in is needed' })
      }
      // Without prompt and max_age, so that signing in, which makes a new session, brings it back once.
      const { prompt: _prompt, max_age: _maxAge, ...again } = query
      const returnTo = withQuery(`${issuer}/oauth-authorizations/authorize`, again)
      return { redirectTo: withQuery(`${url}/sign-in`, { return_to: returnTo }) }
    }
    const code = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
    const authorization = OauthAuthorization.issue({
      client,
      user: session.user,
      redirectUri,
      scopes: scopesOf(query.scope!),
      codeChallenge: query.code_challenge!,
      nonce: query.nonce ?? null,
      amr: session.amr,
      authTime: session.createdAt,
      codeHash: hashOf(code),
      now,
    })
    await this.repository.persist(authorization)
    return back({ code })
  }

  /**
   * Exchanges a code for tokens, once: the client proves itself with its secret, and the code with the PKCE verifier.
   * A code used twice, late, or by another client is refused, all with the same error.
   */
  @UseCase()
  async exchange(input: OauthAuthorizationExchangeDTO): Promise<OauthTokensDTO> {
    const { host, clientId, clientSecret, form } = OauthAuthorizationExchangeSchema.parse(input)
    const { application, url } = await this.deps.application.fromHost(host)
    const client = await this.deps.applicationClient.verifySecret({ clientId, secret: clientSecret })
    if (client?.application.id !== application.id) {
      throw new InvalidClient()
    }
    if (form.grant_type !== 'authorization_code') {
      throw new UnsupportedGrantType()
    }
    const now = this.base.clock.now()
    const [authorization] = await this.repository.find({ codeHash: hashOf(form.code ?? '') }, { limit: 1 })
    const exchange = { clientId: client.id, redirectUri: form.redirect_uri ?? '', codeVerifier: form.code_verifier ?? '', now }
    if (!authorization?.canBeExchanged(exchange)) {
      throw new InvalidGrant()
    }
    // Signed before the code is spent: a key that cannot sign leaves the code for another try.
    const tokens = await this.tokensOf(authorization.toDTO(), { issuer: `${url}${this.prefix}`, audience: url, now })
    authorization.use(now)
    try {
      await this.repository.persist(authorization)
    } catch (error) {
      // Exchanged twice at once: the other one got it.
      throw error instanceof StaleVersion ? new InvalidGrant() : error
    }
    return tokens
  }

  /**
   * Checks a request to end_session (RP-Initiated Logout): it goes back only to a post_logout_redirect_uri of the client,
   * known by client_id or by the id_token_hint this auth signed. The hint is required, and says whose session ends: a
   * link from anywhere signs no one out. It ends nothing: this module never writes sessions.
   */
  @UseCase()
  async endSession(input: OauthAuthorizationEndSessionDTO): Promise<OauthEndSessionDTO> {
    const { host, query } = OauthAuthorizationEndSessionSchema.parse(input)
    const { application, url } = await this.deps.application.fromHost(host)
    const hint = query.id_token_hint === undefined
      ? null
      : await this.deps.oauthSigningKey.verify({ token: query.id_token_hint, issuer: `${url}${this.prefix}`, type: 'JWT' })
    if (typeof hint?.sub !== 'string') {
      throw new InvalidAuthorizationRequest()
    }
    const ending = { applicationSlug: application.slug, userId: hint.sub }
    const back = query.post_logout_redirect_uri
    if (back === undefined) {
      return { ...ending, redirectTo: null }
    }
    const hinted = typeof hint.aud === 'string' ? hint.aud : undefined
    if (query.client_id !== undefined && hinted !== undefined && query.client_id !== hinted) {
      throw new InvalidAuthorizationRequest()
    }
    const client = await this.clientOf(query.client_id ?? hinted)
    if (client.application.id !== application.id || !client.postLogoutRedirectUris.some(each => each === back)) {
      throw new InvalidAuthorizationRequest()
    }
    const state: Record<string, string> = query.state === undefined ? {} : { state: query.state }
    return { ...ending, redirectTo: withQuery(back, state) }
  }

  /**
   * What an access token tells of its user (OpenID's UserInfo), by the scopes it was given. Only a live access token of
   * the application at that host: an id_token, an expired token or one of another application, `InvalidToken`.
   */
  @UseCase()
  async userInfo(input: OauthAuthorizationUserInfoDTO): Promise<OauthUserInfoDTO> {
    const { host, accessToken } = OauthAuthorizationUserInfoSchema.parse(input)
    const { url } = await this.deps.application.fromHost(host)
    const claims = await this.deps.oauthSigningKey.verify({ token: accessToken, issuer: `${url}${this.prefix}`, type: 'at+jwt' })
    const now = Math.floor(this.base.clock.now().getTime() / 1000)
    if (!claims || claims.aud !== url || (claims.exp ?? 0) <= now || typeof claims.sub !== 'string') {
      throw new InvalidToken()
    }
    const [user] = await this.deps.user.find({ id: UserId.from(claims.sub) })
    if (!user) {
      throw new InvalidToken()
    }
    const scopes = typeof claims.scope === 'string' ? claims.scope.split(' ') : []
    return { sub: user.id, ...this.claimsOf(user, scopes) }
  }

  /** What the scopes let a client know of a user, besides its id. */
  private claimsOf(user: UserDTO, scopes: string[]): Record<string, unknown> {
    const email = scopes.includes('email') ? { email: user.email, email_verified: user.emailVerified } : {}
    const profile = scopes.includes('profile') ? { name: user.name } : {}
    return { ...email, ...profile }
  }

  /** The id_token, for the client, and the access token, for the application (RFC 9068): both short, and signed. */
  private async tokensOf(
    { client, user, scopes, nonce, amr, authTime }: OauthAuthorizationDTO,
    { issuer, audience, now }: { issuer: string, audience: string, now: Date },
  ): Promise<OauthTokensDTO> {
    const iat = Math.floor(now.getTime() / 1000)
    const common = { iss: issuer, sub: user.id, iat, exp: iat + TOKEN_LIFETIME_S, auth_time: Math.floor(Date.parse(authTime) / 1000), amr }
    const idClaims = { ...common, aud: client.id, azp: client.id, ...nonce === null ? {} : { nonce }, ...this.claimsOf(user, scopes) }
    const accessClaims = { ...common, aud: audience, client_id: client.id, jti: Bun.randomUUIDv7(), scope: scopes.join(' ') }
    return {
      access_token: await this.deps.oauthSigningKey.sign({ claims: accessClaims, type: 'at+jwt' }),
      token_type: 'Bearer',
      expires_in: TOKEN_LIFETIME_S,
      id_token: await this.deps.oauthSigningKey.sign({ claims: idClaims, type: 'JWT' }),
      scope: scopes.join(' '),
    }
  }

  /** The client of a client_id; any other id, the same error as a redirect_uri it does not have. */
  private async clientOf(clientId: string | undefined): Promise<ApplicationClientDTO> {
    const parsed = ApplicationClientId.schema.safeParse(clientId)
    const [client] = parsed.success ? await this.deps.applicationClient.find({ id: parsed.data }) : []
    if (!client) {
      throw new InvalidAuthorizationRequest()
    }
    return client
  }

  private async issuerAt(host: string): Promise<string> {
    const { url } = await this.deps.application.fromHost(host)
    return `${url}${this.prefix}`
  }

}
