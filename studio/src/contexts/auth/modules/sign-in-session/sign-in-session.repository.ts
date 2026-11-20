import { Repository }               from '@newt-js/core'
import type { ResolvedRow }         from '@newt-js/core'
import type { ContextBase }         from '@newt-js/core/application'
// --------------------------------------------------------
import { SignInSession }            from './sign-in-session'
import type { SignInSession_Deps }  from './sign-in-session.deps'
import type { SignInSessionFields } from './sign-in-session.schema'

export type SignInSessionRow = SignInSessionFields & { version: number }

export class SignInSession_Repository extends Repository<SignInSession, SignInSessionRow> {

  constructor(base: ContextBase, { application, user }: SignInSession_Deps) {
    const records = base.database.records<SignInSessionRow>('sign_in_session')
    super(base, records, {
      scope: 'none',
      references: {
        applicationId: ids => application.find({ field: 'id', op: 'in', value: ids }),
        userId: ids => user.find({ field: 'id', op: 'in', value: ids }),
      },
    })
  }

  protected toEntity(row: ResolvedRow<SignInSessionRow, SignInSession>): SignInSession {
    return SignInSession.fromDTO(row)
  }

}
