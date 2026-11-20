import { Entity }                        from '@newt-js/core'
import type { EntityInput }              from '@newt-js/core'
// --------------------------------------------------------
import { SignInAttempt_Completed }       from './events/sign-in-attempt-completed'
import type { SignInAttemptDTO }         from './sign-in-attempt.schema'
import type { SignInAttemptProgressDTO } from './sign-in-attempt.schema'
import { SignInAttemptSchema }           from './sign-in-attempt.schema'
import type { ApplicationId }            from './value-objects/application-id'
import type { SignInStep }               from './value-objects/sign-in-step'
import type { UserId }                   from './value-objects/user-id'

/** How long one has to finish signing in. */
const LIFETIME_MS = 10 * 60 * 1000
/** Wrong answers an attempt takes before it locks: then, start again. */
const MOST_FAILED_TRIES = 5

export type SignInAttemptStartProps = {
  applicationId: ApplicationId,
  userId: UserId | null,
  steps: SignInStep[],
  now: Date,
}

export class SignInAttempt extends Entity<typeof SignInAttemptSchema> {

  private constructor(input: EntityInput<SignInAttemptDTO>, isNew: boolean) {
    super(SignInAttemptSchema, input, isNew)
  }

  static fromDTO(dto: SignInAttemptDTO & { version: number }): SignInAttempt {
    return new SignInAttempt(dto, false)
  }

  /** An attempt with every step of the policy to do, whether its user exists or not. */
  static start({ applicationId, userId, steps, now }: SignInAttemptStartProps): SignInAttempt {
    const expiresAt = new Date(now.getTime() + LIFETIME_MS).toISOString()
    const progress = { pendingSteps: steps, doneSteps: [], failedTries: 0, expiresAt, completedAt: null }
    return new SignInAttempt({ applicationId, userId, ...progress }, true)
  }

  get userId(): UserId | null {
    return this.data.userId
  }

  get nextStep(): SignInStep | null {
    return this.data.pendingSteps[0] ?? null
  }

  get isLocked(): boolean {
    return this.data.failedTries >= MOST_FAILED_TRIES
  }

  isExpired(now: Date): boolean {
    return now >= new Date(this.data.expiresAt)
  }

  /** Its next step done: the last one completes it, and tells who signed in. */
  pass(now: Date): void {
    const [step, ...pendingSteps] = this.data.pendingSteps
    const doneSteps = [...this.data.doneSteps, step!]
    const completed = pendingSteps.length === 0
    this.change({ pendingSteps, doneSteps, completedAt: completed ? now.toISOString() : null })
    if (completed) {
      const { applicationId, userId } = this.data
      this.trackEvent(new SignInAttempt_Completed({ id: this.id, applicationId, userId: userId!, amr: doneSteps }))
    }
  }

  fail(): void {
    this.change({ failedTries: this.data.failedTries + 1 })
  }

  get progress(): SignInAttemptProgressDTO {
    const { completedAt, expiresAt } = this.data
    return { id: this.id, nextStep: this.nextStep, completed: completedAt !== null, expiresAt }
  }

}
