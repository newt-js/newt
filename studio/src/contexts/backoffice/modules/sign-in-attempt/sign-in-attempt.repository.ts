import { Repository }               from '@newt-js/core'
import type { ResolvedRow }         from '@newt-js/core'
import type { ContextBase }         from '@newt-js/core/application'
// --------------------------------------------------------
import { SignInAttempt }            from './sign-in-attempt'
import type { SignInAttemptFields } from './sign-in-attempt.schema'

export type SignInAttemptRow = SignInAttemptFields & { version: number }

export class SignInAttempt_Repository extends Repository<SignInAttempt, SignInAttemptRow> {

  constructor(base: ContextBase) {
    const records = base.database.records<SignInAttemptRow>('sign_in_attempt')
    super(base, records, { scope: 'none' })
  }

  protected toEntity(row: ResolvedRow<SignInAttemptRow, SignInAttempt>): SignInAttempt {
    return SignInAttempt.fromDTO(row)
  }

}
