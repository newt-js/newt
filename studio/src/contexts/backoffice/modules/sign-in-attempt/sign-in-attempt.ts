import { Entity }                    from '@newt-js/core'
import type { EntityInput }          from '@newt-js/core'
// --------------------------------------------------------
import { SignInAttempt_Created }     from './events/sign-in-attempt-created'
import type { SignInAttemptFields }  from './sign-in-attempt.schema'
import { SignInAttemptPublicSchema } from './sign-in-attempt.schema'
import { SignInAttemptSchema }       from './sign-in-attempt.schema'

/** How long the browser has to sign in at auth and come back. */
const LIFETIME_MS = 10 * 60 * 1000

export type SignInAttemptStartProps = {
  stateHash: string,
  nonce: string,
  codeVerifier: string,
  now: Date,
}

export class SignInAttempt extends Entity<typeof SignInAttemptSchema, typeof SignInAttemptPublicSchema> {

  private constructor(input: EntityInput<SignInAttemptFields>, isNew: boolean) {
    super(SignInAttemptSchema, input, isNew, SignInAttemptPublicSchema)
  }

  static fromDTO(row: SignInAttemptFields & { version: number }): SignInAttempt {
    return new SignInAttempt(row, false)
  }

  /** An attempt that lasts LIFETIME_MS, waiting for the browser to come back. */
  static start({ now, ...props }: SignInAttemptStartProps): SignInAttempt {
    const expiresAt = new Date(now.getTime() + LIFETIME_MS).toISOString()
    const attempt = new SignInAttempt({ ...props, userId: null, idToken: null, expiresAt, finishedAt: null }, true)
    attempt.trackEvent(new SignInAttempt_Created(attempt.toDTO()))
    return attempt
  }

  /** Sent to auth in the authorization request, and found again in the id_token. */
  get nonce(): string {
    return this.data.nonce
  }

  /** The PKCE secret: its hash goes to /authorize, and itself to /token. */
  get codeVerifier(): string {
    return this.data.codeVerifier
  }

}
