import { Repository }                   from '@newt-js/core'
import type { ResolvedRow }             from '@newt-js/core'
import type { ContextBase }             from '@newt-js/core/application'
// --------------------------------------------------------
import { ApplicationClient }            from './application-client'
import type { ApplicationClient_Deps }  from './application-client.deps'
import type { ApplicationClientFields } from './application-client.schema'

export type ApplicationClientRow = ApplicationClientFields & { version: number }

export class ApplicationClient_Repository extends Repository<ApplicationClient, ApplicationClientRow> {

  constructor(base: ContextBase, { application }: ApplicationClient_Deps) {
    const records = base.database.records<ApplicationClientRow>('application_client')
    super(base, records, {
      scope: 'none',
      references: {
        applicationId: ids => application.find({ field: 'id', op: 'in', value: ids }),
      },
    })
  }

  protected toEntity(row: ResolvedRow<ApplicationClientRow, ApplicationClient>): ApplicationClient {
    return ApplicationClient.fromDTO(row)
  }

}
