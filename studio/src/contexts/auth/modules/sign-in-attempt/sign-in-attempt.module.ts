import { Module }                        from '@newt-js/core'
import { UseCase }                       from '@newt-js/core'
import { eventsOf }                      from '@newt-js/core'
import type { ContextBase }              from '@newt-js/core/application'
import type { HttpRouter }               from '@newt-js/core/http'
// --------------------------------------------------------
import { SignInAttemptExpired }          from './errors/sign-in-attempt-expired'
import { SignInAttemptLocked }           from './errors/sign-in-attempt-locked'
import { SignInAttemptNotFound }         from './errors/sign-in-attempt-not-found'
import { UnexpectedSignInStep }          from './errors/unexpected-sign-in-step'
import { WrongCredentials }              from './errors/wrong-credentials'
import { SignInAttempt_Completed }       from './events/sign-in-attempt-completed'
import { SignInAttempt }                 from './sign-in-attempt'
import type { SignInAttempt_Deps }       from './sign-in-attempt.deps'
import { SignInAttempt_Repository }      from './sign-in-attempt.repository'
import { registerSignInAttemptRoutes }   from './sign-in-attempt.routes'
import type { SignInAttemptAnswerDTO }   from './sign-in-attempt.schema'
import { SignInAttemptAnswerSchema }     from './sign-in-attempt.schema'
import type { SignInAttemptDTO }         from './sign-in-attempt.schema'
import type { SignInAttemptProgressDTO } from './sign-in-attempt.schema'
import type { SignInAttemptStartDTO }    from './sign-in-attempt.schema'
import { SignInAttemptStartSchema }      from './sign-in-attempt.schema'
import { SignInAttemptId }               from './value-objects/sign-in-attempt-id'
import { SignInStep }                    from './value-objects/sign-in-step'
import { UserId }                        from './value-objects/user-id'

/** The steps every sign-in takes today. Later, the strictest of its application's and its user's policies. */
const POLICY = [SignInStep.password]
/** Whom an attempt checks the password of when no user has its email: no one, as slowly. */
const NOBODY = UserId.generate()
/** Wrong answers a user takes, across all its attempts, before its sign-in locks for a while. */
const MOST_FAILED_TRIES_OF_A_USER = 10
const USER_LOCK_WINDOW_MS = 15 * 60 * 1000

/** Signing in step by step. It never tells whether an email exists: both ways answer the same. */
export class SignInAttempt_Module extends Module {

  static initialize(base: ContextBase, router: HttpRouter, deps: SignInAttempt_Deps): SignInAttempt_Module {
    const repository = new SignInAttempt_Repository(base, deps)
    return new SignInAttempt_Module(base, repository, router, deps)
  }

  readonly events
  readonly routes

  private constructor(
    private readonly base: ContextBase,
    private readonly repository: SignInAttempt_Repository,
    router: HttpRouter,
    private readonly deps: SignInAttempt_Deps,
  ) {
    super('signInAttempt', base.useCaseRunner, deps)
    this.events = eventsOf(base.bus, {
      completed: SignInAttempt_Completed,
    })
    this.routes = registerSignInAttemptRoutes(router, this, base.rateLimits)
  }

  @UseCase()
  async start(input: SignInAttemptStartDTO): Promise<SignInAttemptProgressDTO> {
    const { applicationId, email } = SignInAttemptStartSchema.parse(input)
    const application = await this.deps.application.get(applicationId)
    const [user] = await this.deps.user.find({ applicationId, email })
    const now = this.base.clock.now()
    const attempt = SignInAttempt.start({ application, user: user ?? null, steps: POLICY, now })
    await this.repository.persist(attempt)
    return attempt.progress
  }

  @UseCase()
  async get(id: string): Promise<SignInAttemptDTO> {
    const [attempt] = await this.repository.find({ id: SignInAttemptId.from(id) }, { limit: 1 })
    if (!attempt) {
      throw new SignInAttemptNotFound()
    }
    return attempt.toDTO()
  }

  /**
   * Checks the answer to the next step. A wrong one counts towards locking the attempt, and its user.
   * A locked user answers as a wrong password does, so a lock never tells that an email exists.
   */
  @UseCase()
  async answerStep(input: SignInAttemptAnswerDTO): Promise<SignInAttemptProgressDTO> {
    const { attemptId, step, answer } = SignInAttemptAnswerSchema.parse(input)
    const [attempt] = await this.repository.find({ id: attemptId }, { limit: 1 })
    if (!attempt) {
      throw new SignInAttemptNotFound()
    }
    const now = this.base.clock.now()
    if (attempt.isExpired(now)) {
      throw new SignInAttemptExpired()
    }
    if (attempt.isLocked) {
      throw new SignInAttemptLocked()
    }
    if (attempt.nextStep !== step) {
      throw new UnexpectedSignInStep()
    }
    const userId = attempt.userId && !await this.isUserLocked(attempt.userId, now) ? attempt.userId : NOBODY
    const passed = await this.deps.userCredential.verify({ userId, password: answer })
    if (passed) {
      attempt.pass(now)
    } else {
      attempt.fail()
    }
    await this.repository.persist(attempt)
    if (!passed) {
      throw new WrongCredentials()
    }
    return attempt.progress
  }

  /** Whether the user failed too many times lately, whatever attempts it started. */
  private async isUserLocked(userId: UserId, now: Date): Promise<boolean> {
    const since = new Date(now.getTime() - USER_LOCK_WINDOW_MS).toISOString()
    const recent = await this.repository.find({ userId, createdAt: { gte: since } })
    const failedTries = recent.reduce((sum, each) => sum + each.toDTO().failedTries, 0)
    return failedTries >= MOST_FAILED_TRIES_OF_A_USER
  }

}
