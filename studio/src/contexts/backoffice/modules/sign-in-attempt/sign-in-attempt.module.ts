import { Module }                        from '@newt-js/core'
import { UseCase }                       from '@newt-js/core'
import { eventsOf }                      from '@newt-js/core'
import type { ContextBase }              from '@newt-js/core/application'
import type { HttpRouter }               from '@newt-js/core/http'
// --------------------------------------------------------
import { InvalidSignInCallback }         from './errors/invalid-sign-in-callback'
import { SignInAttemptExpired }          from './errors/sign-in-attempt-expired'
import { SignInAttemptNotFound }         from './errors/sign-in-attempt-not-found'
import { SignInAttempt_Created }         from './events/sign-in-attempt-created'
import { metadataOf }                    from './services/auth-provider'
import { providerSettings }              from './services/auth-provider'
import { randomValue }                   from './services/auth-provider'
import { redeemCode }                    from './services/auth-provider'
import { sha256 }                        from './services/auth-provider'
import { subjectOf }                     from './services/auth-provider'
import { SignInAttempt }                 from './sign-in-attempt'
import { SignInAttempt_Repository }      from './sign-in-attempt.repository'
import { SIGN_IN_COOKIE }                from './sign-in-attempt.routes'
import { registerSignInAttemptRoutes }   from './sign-in-attempt.routes'
import type { SignInAttemptDTO }         from './sign-in-attempt.schema'
import type { SignInAttemptFinishDTO }   from './sign-in-attempt.schema'
import { SignInAttemptFinishSchema }     from './sign-in-attempt.schema'
import type { SignInAttemptFinishedDTO } from './sign-in-attempt.schema'
import type { SignInAttemptStartedDTO }  from './sign-in-attempt.schema'
import { SignInAttemptId }               from './value-objects/sign-in-attempt-id'

/** Signing in to backoffice through auth, by OpenID Connect: backoffice never sees a password. */
export class SignInAttempt_Module extends Module {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
  ): SignInAttempt_Module {
    const repository = new SignInAttempt_Repository(base)
    const module = new SignInAttempt_Module(base, repository, router)
    return module
  }

  readonly events
  readonly routes

  private constructor(
    private readonly base: ContextBase,
    private readonly repository: SignInAttempt_Repository,
    private readonly router: HttpRouter,
  ) {
    super('signInAttempt', base.useCaseRunner)
    this.events = eventsOf(base.bus, {
      created: SignInAttempt_Created,
    })
    this.routes = registerSignInAttemptRoutes(router, this)
  }

  /**
   * Starts a sign-in: keeps a state, a nonce and a PKCE verifier, and says where in auth to send the browser.
   * The state goes back to the browser too, for its cookie: only that browser can finish the attempt.
   */
  @UseCase()
  async start(): Promise<SignInAttemptStartedDTO> {
    const { issuer, clientId } = providerSettings()
    const { authorization_endpoint } = await metadataOf(issuer)
    const state = randomValue()
    const attempt = SignInAttempt.start({
      stateHash: sha256(state),
      nonce: randomValue(),
      codeVerifier: randomValue(),
      now: this.base.clock.now(),
    })
    await this.repository.persist(attempt)
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: this.callbackUrl(),
      scope: 'openid',
      state,
      nonce: attempt.nonce,
      code_challenge: sha256(attempt.codeVerifier),
      code_challenge_method: 'S256',
    })
    return { redirectTo: `${authorization_endpoint}?${query}`, state }
  }

  /**
   * Finishes the attempt the browser comes back with: its cookie and auth's state must match, auth must be backoffice's
   * issuer, and the code must give an id_token for this attempt's nonce. Anything else, `InvalidSignInCallback`.
   */
  @UseCase()
  async finish(input: SignInAttemptFinishDTO): Promise<SignInAttemptFinishedDTO> {
    const { query, cookies } = SignInAttemptFinishSchema.parse(input)
    const state = cookies[SIGN_IN_COOKIE]
    // The state in the cookie, not only in the address: a link with someone else's code signs no one in here.
    if (state === undefined || query.state !== state) {
      throw new InvalidSignInCallback()
    }
    const [attempt] = await this.repository.find({ stateHash: sha256(state) }, { limit: 1 })
    const now = this.base.clock.now()
    if (!attempt || attempt.isFinished()) {
      throw new InvalidSignInCallback()
    }
    if (attempt.hasExpired(now)) {
      throw new SignInAttemptExpired()
    }
    // RFC 9207: auth says who it is, so a code of another issuer is never sent to this one.
    const cameBackFromAuth = query.iss === providerSettings().issuer && query.error === undefined
    if (!cameBackFromAuth || query.code === undefined) {
      throw new InvalidSignInCallback()
    }
    const idToken = await redeemCode({ code: query.code, codeVerifier: attempt.codeVerifier, redirectUri: this.callbackUrl() })
    const userId = idToken === null ? null : await subjectOf({ idToken, nonce: attempt.nonce, now })
    if (idToken === null || userId === null) {
      throw new InvalidSignInCallback()
    }
    attempt.finish({ userId, idToken, now })
    await this.repository.persist(attempt)
    return { attempt: attempt.toDTO(), spentCookie: SIGN_IN_COOKIE }
  }

  @UseCase()
  async get(id: string): Promise<SignInAttemptDTO> {
    const [attempt] = await this.repository.find({ id: SignInAttemptId.from(id) }, { limit: 1 })
    if (!attempt) {
      throw new SignInAttemptNotFound()
    }
    return attempt.toDTO()
  }

  /** Where auth sends the browser back: the route of signInSession that finishes the attempt and opens the session. */
  private callbackUrl(): string {
    return `${providerSettings().publicUrl}${this.router.prefix}/sign-in-sessions/callback`
  }

}
