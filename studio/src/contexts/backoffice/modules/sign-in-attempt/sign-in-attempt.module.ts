import { Module }                       from '@newt-js/core'
import { UseCase }                      from '@newt-js/core'
import { eventsOf }                     from '@newt-js/core'
import type { ContextBase }             from '@newt-js/core/application'
import type { HttpRouter }              from '@newt-js/core/http'
// --------------------------------------------------------
import { SignInAttempt_Created }        from './events/sign-in-attempt-created'
import { metadataOf }                   from './services/auth-provider'
import { providerSettings }             from './services/auth-provider'
import { randomValue }                  from './services/auth-provider'
import { sha256 }                       from './services/auth-provider'
import { SignInAttempt }                from './sign-in-attempt'
import { SignInAttempt_Repository }     from './sign-in-attempt.repository'
import { registerSignInAttemptRoutes }  from './sign-in-attempt.routes'
import type { SignInAttemptStartedDTO } from './sign-in-attempt.schema'

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

  /** Where auth sends the browser back: the route of signInSession that finishes the attempt and opens the session. */
  private callbackUrl(): string {
    return `${providerSettings().publicUrl}${this.router.prefix}/sign-in-sessions/callback`
  }

}
