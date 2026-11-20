import { Entity }                       from '@newt-js/core'
import type { EntityInput }             from '@newt-js/core'
import type { Resolved }                from '@newt-js/core'
// --------------------------------------------------------
import type { ApplicationDTO }          from '../application/application.schema'
import type { UserDTO }                 from '../user/user.schema'
import { SignInSession_Created }        from './events/sign-in-session-created'
import type { SignInSessionFields }     from './sign-in-session.schema'
import { SignInSessionPublicSchema }    from './sign-in-session.schema'
import type { SignInSessionReferences } from './sign-in-session.schema'
import { SignInSessionSchema }          from './sign-in-session.schema'
import type { SignInAttemptId }         from './value-objects/sign-in-attempt-id'
import type { SignInStep }              from './value-objects/sign-in-step'
import type { UserId }                  from './value-objects/user-id'

/** How long a session lasts, however much it is used. */
const LIFETIME_MS = 8 * 60 * 60 * 1000

export type SignInSessionOpenProps = {
  application: ApplicationDTO,
  user: UserDTO,
  attemptId: SignInAttemptId,
  amr: SignInStep[],
  tokenHash: string,
  now: Date,
}

type SignInSessionRowDTO = Resolved<SignInSessionFields, SignInSessionReferences>

export class SignInSession
  extends Entity<typeof SignInSessionSchema, typeof SignInSessionPublicSchema, SignInSessionReferences> {

  private constructor(input: EntityInput<SignInSessionRowDTO>, isNew: boolean) {
    super(SignInSessionSchema, input, isNew, SignInSessionPublicSchema)
  }

  static fromDTO(row: SignInSessionRowDTO & { version: number }): SignInSession {
    return new SignInSession(row, false)
  }

  /** A session of the attempt's user, for as long as LIFETIME_MS. */
  static open({ now, ...props }: SignInSessionOpenProps): SignInSession {
    const expiresAt = new Date(now.getTime() + LIFETIME_MS).toISOString()
    const session = new SignInSession({ ...props, expiresAt, endedAt: null }, true)
    session.trackEvent(new SignInSession_Created(session.data))
    return session
  }

  get userId(): UserId {
    return this.data.userId
  }

  get application(): ApplicationDTO {
    return this.toDTO().application
  }

  isAlive(now: Date): boolean {
    return this.data.endedAt === null && now < new Date(this.data.expiresAt)
  }

}
