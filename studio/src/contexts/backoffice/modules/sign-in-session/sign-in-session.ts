import { Entity }                    from '@newt-js/core'
import type { EntityInput }          from '@newt-js/core'
// --------------------------------------------------------
import { SignInSession_Created }     from './events/sign-in-session-created'
import type { SignInSessionFields }  from './sign-in-session.schema'
import { SignInSessionPublicSchema } from './sign-in-session.schema'
import { SignInSessionSchema }       from './sign-in-session.schema'
import type { SignInAttemptId }      from './value-objects/sign-in-attempt-id'

/** How long a session lasts, however much it is used: as auth's. */
const LIFETIME_MS = 8 * 60 * 60 * 1000

export type SignInSessionOpenProps = {
  attemptId: SignInAttemptId,
  userId: string,
  tokenHash: string,
  now: Date,
}

export class SignInSession extends Entity<typeof SignInSessionSchema, typeof SignInSessionPublicSchema> {

  private constructor(input: EntityInput<SignInSessionFields>, isNew: boolean) {
    super(SignInSessionSchema, input, isNew, SignInSessionPublicSchema)
  }

  static fromDTO(row: SignInSessionFields & { version: number }): SignInSession {
    return new SignInSession(row, false)
  }

  /** A session of the user of a finished attempt, for as long as LIFETIME_MS. */
  static open({ now, ...props }: SignInSessionOpenProps): SignInSession {
    const expiresAt = new Date(now.getTime() + LIFETIME_MS).toISOString()
    const session = new SignInSession({ ...props, expiresAt, endedAt: null }, true)
    session.trackEvent(new SignInSession_Created(session.toDTO()))
    return session
  }

}
