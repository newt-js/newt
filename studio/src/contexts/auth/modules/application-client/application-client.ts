import { Entity }                           from '@newt-js/core'
import type { EntityInput }                 from '@newt-js/core'
import type { Resolved }                    from '@newt-js/core'
import { default as crypto }                from 'node:crypto'
// --------------------------------------------------------
import type { ApplicationDTO }              from '../application/application.schema'
import type { ApplicationClientFields }     from './application-client.schema'
import { ApplicationClientPublicSchema }    from './application-client.schema'
import type { ApplicationClientReferences } from './application-client.schema'
import { ApplicationClientSchema }          from './application-client.schema'
import { ApplicationClient_Created }        from './events/application-client-created'
import type { RedirectUri }                 from './value-objects/redirect-uri'

export type ApplicationClientRegisterProps = {
  application: ApplicationDTO,
  name: string,
  secretHash: string,
  redirectUris: RedirectUri[],
  postLogoutRedirectUris: RedirectUri[],
}

type ApplicationClientRowDTO = Resolved<ApplicationClientFields, ApplicationClientReferences>

export class ApplicationClient
  extends Entity<typeof ApplicationClientSchema, typeof ApplicationClientPublicSchema, ApplicationClientReferences> {

  private constructor(input: EntityInput<ApplicationClientRowDTO>, isNew: boolean) {
    super(ApplicationClientSchema, input, isNew, ApplicationClientPublicSchema)
  }

  static fromDTO(row: ApplicationClientRowDTO & { version: number }): ApplicationClient {
    return new ApplicationClient(row, false)
  }

  static register(props: ApplicationClientRegisterProps): ApplicationClient {
    const client = new ApplicationClient(props, true)
    client.trackEvent(new ApplicationClient_Created(client.data))
    return client
  }

  /** Whether a secret's hash is this client's, compared in constant time. */
  hasSecret(secretHash: string): boolean {
    const own = Buffer.from(this.data.secretHash)
    const given = Buffer.from(secretHash)
    return own.length === given.length && crypto.timingSafeEqual(own, given)
  }

}
