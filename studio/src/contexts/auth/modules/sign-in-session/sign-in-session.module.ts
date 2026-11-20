import { Module }                       from '@newt-js/core'
import { UseCase }                      from '@newt-js/core'
import { eventsOf }                     from '@newt-js/core'
import type { ContextBase }             from '@newt-js/core/application'
import type { HttpRouter }              from '@newt-js/core/http'
// --------------------------------------------------------
import { SignInAttemptExpired }         from '../sign-in-attempt/errors/sign-in-attempt-expired'
import { SignInNotCompleted }           from './errors/sign-in-not-completed'
import { SignInSession_Created }        from './events/sign-in-session-created'
import { SignInSession }                from './sign-in-session'
import type { SignInSession_Deps }      from './sign-in-session.deps'
import { SignInSession_Repository }     from './sign-in-session.repository'
import { registerSignInSessionRoutes }  from './sign-in-session.routes'
import type { SignInSessionActorOfDTO } from './sign-in-session.schema'
import { SignInSessionActorOfSchema }   from './sign-in-session.schema'
import type { SignInSessionOpenedDTO }  from './sign-in-session.schema'
import { SignInAttemptId }              from './value-objects/sign-in-attempt-id'
import { SignInStep }                   from './value-objects/sign-in-step'

/** Only the hash of a token is kept: a leaked table opens no session. */
function hashOf(token: string): string {
  return new Bun.CryptoHasher('sha256').update(token).digest('hex')
}

/** The sessions of those who signed in: opened by a completed attempt, read back by its cookie. */
export class SignInSession_Module extends Module {

  static initialize(base: ContextBase, router: HttpRouter, deps: SignInSession_Deps): SignInSession_Module {
    const repository = new SignInSession_Repository(base, deps)
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
    this.routes = registerSignInSessionRoutes(router, this)
  }

  /** Opens the session of a completed attempt, once: the token it gives back is never seen again. */
  @UseCase()
  async open(attemptId: string): Promise<SignInSessionOpenedDTO> {
    const attempt = await this.deps.signInAttempt.get(SignInAttemptId.from(attemptId))
    if (attempt.completedAt === null) {
      throw new SignInNotCompleted()
    }
    const now = this.base.clock.now()
    if (now >= new Date(attempt.expiresAt)) {
      throw new SignInAttemptExpired()
    }
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
    const session = SignInSession.open({
      application: attempt.application,
      user: attempt.user!,
      attemptId: SignInAttemptId.from(attempt.id),
      amr: attempt.doneSteps.map(step => SignInStep.from(step)),
      tokenHash: hashOf(token),
      now,
    })
    await this.repository.persist(session)
    return { session: session.toDTO(), token }
  }

  /** Who a token is of, while its session lives and is of that application; otherwise no one. */
  @UseCase()
  async actorOf(input: SignInSessionActorOfDTO): Promise<{ userId: string } | null> {
    const { token, applicationSlug } = SignInSessionActorOfSchema.parse(input)
    const [session] = await this.repository.find({ tokenHash: hashOf(token) }, { limit: 1 })
    if (!session?.isAlive(this.base.clock.now()) || session.application.slug !== applicationSlug) {
      return null
    }
    return { userId: session.userId }
  }

}
