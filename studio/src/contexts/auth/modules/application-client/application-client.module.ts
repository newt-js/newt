import { Module }                              from '@newt-js/core'
import type { Page }                           from '@newt-js/core'
import type { PageRequest }                    from '@newt-js/core'
import { UseCase }                             from '@newt-js/core'
import { eventsOf }                            from '@newt-js/core'
import { mapPage }                             from '@newt-js/core'
import type { ContextBase }                    from '@newt-js/core/application'
import type { HttpRouter }                     from '@newt-js/core/http'
// --------------------------------------------------------
import { ApplicationClient }                   from './application-client'
import type { ApplicationClient_Deps }         from './application-client.deps'
import { ApplicationClient_Repository }        from './application-client.repository'
import { registerApplicationClientRoutes }     from './application-client.routes'
import type { ApplicationClientDTO }           from './application-client.schema'
import { ApplicationClientFilter }             from './application-client.schema'
import type { ApplicationClientFilterDTO }     from './application-client.schema'
import type { ApplicationClientRegisterDTO }   from './application-client.schema'
import { ApplicationClientRegisterSchema }     from './application-client.schema'
import type { ApplicationClientRegisteredDTO } from './application-client.schema'
import type { ApplicationClientSortDTO }       from './application-client.schema'
import { ApplicationClientNotFound }           from './errors/application-client-not-found'
import { ApplicationClient_Created }           from './events/application-client-created'
import { ApplicationClientId }                 from './value-objects/application-client-id'

/** A secret too long to guess needs no slow hash: SHA-256, as the tokens of sessions. */
function hashOf(secret: string): string {
  return new Bun.CryptoHasher('sha256').update(secret).digest('hex')
}

/** The programs that sign people in to an application. Its routes are the admin's. */
export class ApplicationClient_Module extends Module {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
    deps: ApplicationClient_Deps,
  ): ApplicationClient_Module {
    const repository = new ApplicationClient_Repository(base, deps)
    const module = new ApplicationClient_Module(base, repository, router, deps)
    return module
  }

  readonly events
  readonly routes

  private constructor(
    base: ContextBase,
    private readonly repository: ApplicationClient_Repository,
    router: HttpRouter,
    private readonly deps: ApplicationClient_Deps,
  ) {
    super('applicationClient', base.useCaseRunner, deps)
    this.events = eventsOf(base.bus, {
      created: ApplicationClient_Created,
    })
    this.routes = registerApplicationClientRoutes(router, this)
  }

  /** A client of an application with a new secret, seen only in what this returns. */
  @UseCase()
  async register(input: ApplicationClientRegisterDTO): Promise<ApplicationClientRegisteredDTO> {
    const { applicationId, postLogoutRedirectUris = [], ...props } = ApplicationClientRegisterSchema.parse(input)
    const application = await this.deps.application.get(applicationId)
    const secret = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
    const client = ApplicationClient.register({ application, postLogoutRedirectUris, secretHash: hashOf(secret), ...props })
    await this.repository.persist(client)
    return { client: client.toDTO(), secret }
  }

  @UseCase()
  async get(id: string): Promise<ApplicationClientDTO> {
    const [client] = await this.repository.find({ id: ApplicationClientId.from(id) }, { limit: 1 })
    if (!client) {
      throw new ApplicationClientNotFound()
    }
    return client.toDTO()
  }

  @UseCase()
  async find(criteria: ApplicationClientFilterDTO, sort?: ApplicationClientSortDTO): Promise<ApplicationClientDTO[]> {
    const found = await this.repository.find(ApplicationClientFilter.toCriteria(criteria), { orderBy: ApplicationClientFilter.toOrder(sort) })
    return found.map(each => each.toDTO())
  }

  @UseCase()
  async paginate(criteria: ApplicationClientFilterDTO, page: PageRequest): Promise<Page<ApplicationClientDTO>> {
    const found = await this.repository.paginate(ApplicationClientFilter.toCriteria(criteria), page, { newestFirst: true })
    return mapPage(found, each => each.toDTO())
  }

}
