import { Entity }              from '@newt-js/core'
import type { EntityInput }    from '@newt-js/core'
// --------------------------------------------------------
import type { ApplicationDTO } from './application.schema'
import { ApplicationSchema }   from './application.schema'
import { Application_Created } from './events/application-created'

export type ApplicationCreateProps = { slug: string, name: string }

export class Application extends Entity<typeof ApplicationSchema> {

  private constructor(input: EntityInput<ApplicationDTO>, isNew: boolean) {
    super(ApplicationSchema, input, isNew)
  }

  static fromDTO(dto: ApplicationDTO & { version: number }): Application {
    return new Application(dto, false)
  }

  static create(props: ApplicationCreateProps): Application {
    const application = new Application(
      { ...props, registration: 'closed' },
      true,
    )
    application.trackEvent(new Application_Created(application.toDTO()))
    return application
  }

}
