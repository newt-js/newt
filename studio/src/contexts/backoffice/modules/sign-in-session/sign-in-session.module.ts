import { Module }                      from '@newt-js/core'
import { UseCase }                     from '@newt-js/core'
import { eventsOf }                    from '@newt-js/core'
import type { ContextBase }            from '@newt-js/core/application'
import type { HttpRouter }             from '@newt-js/core/http'
// --------------------------------------------------------
import { SignInNotFinished }           from './errors/sign-in-not-finished'
import { SignInSession_Created }       from './events/sign-in-session-created'
import { SignInSession }               from './sign-in-session'
import type { SignInSession_Deps }     from './sign-in-session.deps'
import { SignInSession_Repository }    from './sign-in-session.repository'
import { registerSignInSessionRoutes } from './sign-in-session.routes'
import type { SignInSessionDTO }       from './sign-in-session.schema'
import type { SignInSessionOpenDTO }   from './sign-in-session.schema'
import { SignInSessionOpenSchema }     from './sign-in-session.schema'
import type { SignInSessionOpenedDTO } from './sign-in-session.schema'
import { SignInSessionTokenSchema }    from './sign-in-session.schema'
import { SignInAttemptId }             from './value-objects/sign-in-attempt-id'

/** Only the hash of a token is kept: a leaked table opens no session. */
function hashOf(token: string): string {
  return new Bun.CryptoHasher('sha256').update(token).digest('hex')
}

/** The sessions of backoffice: opened by an attempt auth finished, read back by their cookie. */
export class SignInSession_Module extends Module {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
    deps: SignInSession_Deps,
  ): SignInSession_Module {
    const repository = new SignInSession_Repository(base)
    const module = new SignInSession_Module(base, repository, router, deps)
    return module
  }

  readonly events
  readonly routes

  private constructor(
    private readonly base: ContextBase,
    private readonly repository: SignInSession_Repository,
    router: HttpRouter,
    private readonly deps: SignInSession_Deps,
  ) {
    super('signInSession', base.useCaseRunner, deps)
    this.events = eventsOf(base.bus, {
      created: SignInSession_Created,
    })
    this.routes = registerSignInSessionRoutes(router, this, deps)
  }

  /** Opens the session of a finished attempt, once: the token it gives back is never seen again. */
  @UseCase()
  async open(input: SignInSessionOpenDTO): Promise<SignInSessionOpenedDTO> {
    const { attemptId } = SignInSessionOpenSchema.parse(input)
    const attempt = await this.deps.signInAttempt.get(attemptId)
    if (attempt.finishedAt === null || attempt.userId === null) {
      throw new SignInNotFinished()
    }
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
    const session = SignInSession.open({
      attemptId: SignInAttemptId.from(attempt.id),
      userId: attempt.userId,
      tokenHash: hashOf(token),
      now: this.base.clock.now(),
    })
    await this.repository.persist(session)
    return { session: session.toDTO(), token }
  }

  /** The session of a cookie's token, while it lives; otherwise none. */
  @UseCase()
  async current(token: string): Promise<SignInSessionDTO | null> {
    return (await this.aliveSession(token))?.toDTO() ?? null
  }

  /** Who a cookie's token is of, while its session lives; otherwise no one. */
  @UseCase()
  async actorOf(token: string): Promise<{ userId: string } | null> {
    const session = await this.aliveSession(token)
    return session ? { userId: session.toDTO().userId } : null
  }

  private async aliveSession(token: string): Promise<SignInSession | undefined> {
    // A cookie no session could have, a forged one too long: no one, never an error.
    const parsed = SignInSessionTokenSchema.safeParse(token)
    if (!parsed.success) {
      return undefined
    }
    const [session] = await this.repository.find({ tokenHash: hashOf(parsed.data) }, { limit: 1 })
    return session?.isAlive(this.base.clock.now()) ? session : undefined
  }

}
