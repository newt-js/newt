import { Repository }             from '@newt-js/core'
import type { ResolvedRow }       from '@newt-js/core'
import type { ContextBase }       from '@newt-js/core/application'
import type { z }                 from 'zod'
// --------------------------------------------------------
import { Application }            from './application'
import type { ApplicationSchema } from './application.schema'

type ApplicationFields = z.infer<typeof ApplicationSchema>

export type ApplicationRow = ApplicationFields & { version: number }

export class Application_Repository
  extends Repository<Application, ApplicationRow> {

  constructor(base: ContextBase) {
    const records = base.database.records<ApplicationRow>('application')
    super(base, records, { scope: 'none' })
  }

  protected toEntity(
    row: ResolvedRow<ApplicationRow, Application>,
  ): Application {
    return Application.fromDTO(row)
  }

}
