import { Module }                    from '@newt-js/core'
import type { Page }                 from '@newt-js/core'
import type { PageRequest }          from '@newt-js/core'
import { UseCase }                   from '@newt-js/core'
import { eventsOf }                  from '@newt-js/core'
import { mapPage }                   from '@newt-js/core'
import type { ContextBase }          from '@newt-js/core/application'
import type { HttpRouter }           from '@newt-js/core/http'
// --------------------------------------------------------
import { Application }               from './application'
import { Application_Repository }    from './application.repository'
import { registerApplicationRoutes } from './application.routes'
import type { ApplicationAtHostDTO } from './application.schema'
import type { ApplicationCreateDTO } from './application.schema'
import { ApplicationCreateSchema }   from './application.schema'
import type { ApplicationDTO }       from './application.schema'
import { ApplicationFilter }         from './application.schema'
import type { ApplicationFilterDTO } from './application.schema'
import type { ApplicationSortDTO }   from './application.schema'
import { ApplicationNotFound }       from './errors/application-not-found'
import { SlugTaken }                 from './errors/slug-taken'
import { Application_Created }       from './events/application-created'
import { applicationUrlOf }          from './services/application-urls'
import { slugAtHost }                from './services/application-urls'
import { ApplicationId }             from './value-objects/application-id'
import { ApplicationSlug }           from './value-objects/application-slug'

/** How many slugs made from a name are looked for at once. */
const SLUGS_AT_ONCE = 10

export class Application_Module extends Module {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
  ): Application_Module {
    const repository = new Application_Repository(base)
    const module = new Application_Module(base, repository, router)
    return module
  }

  readonly events
  readonly routes

  private constructor(
    base: ContextBase,
    private readonly repository: Application_Repository,
    router: HttpRouter,
  ) {
    super('application', base.useCaseRunner)
    this.events = eventsOf(base.bus, {
      created: Application_Created,
    })
    this.routes = registerApplicationRoutes(router, this)
  }

  @UseCase()
  async create(input: ApplicationCreateDTO): Promise<ApplicationDTO> {
    const { slug, name } = ApplicationCreateSchema.parse(input)
    const given = slug !== undefined
    if (given && await this.isTaken(slug)) {
      throw new SlugTaken()
    }
    const free = given ? slug : await this.freeSlugFor(name)
    const application = Application.create({ slug: free, name })
    await this.repository.persist(application)
    return application.toDTO()
  }

  @UseCase()
  async get(id: string): Promise<ApplicationDTO> {
    const [application] = await this.repository.find(
      { id: ApplicationId.from(id) },
      { limit: 1 },
    )
    if (!application) {
      throw new ApplicationNotFound()
    }
    return application.toDTO()
  }

  @UseCase()
  async find(
    criteria: ApplicationFilterDTO,
    sort?: ApplicationSortDTO,
  ): Promise<ApplicationDTO[]> {
    const found = await this.repository.find(
      ApplicationFilter.toCriteria(criteria),
      { orderBy: ApplicationFilter.toOrder(sort) },
    )
    return found.map(each => each.toDTO())
  }

  @UseCase()
  async paginate(
    criteria: ApplicationFilterDTO,
    page: PageRequest,
  ): Promise<Page<ApplicationDTO>> {
    const found = await this.repository.paginate(
      ApplicationFilter.toCriteria(criteria),
      page,
      { newestFirst: true },
    )
    return mapPage(found, each => each.toDTO())
  }

  private async isTaken(slug: string): Promise<boolean> {
    const found = await this.repository.find({ slug }, { limit: 1 })
    return found.length > 0
  }

  /** The slug made from the name or, when taken, the first free `-2`, `-3`… */
  private async freeSlugFor(name: string): Promise<string> {
    const slug = ApplicationSlug.fromName(name)
    for (let from = 1; ; from += SLUGS_AT_ONCE) {
      const tried = ApplicationSlug.numbered(slug, from, SLUGS_AT_ONCE)
      const found = await this.repository.find({ slug: { in: tried } })
      const taken = new Set(found.map(each => each.toDTO().slug))
      const free = tried.find(each => !taken.has(each))
      if (free !== undefined) {
        return free
      }
    }
  }

  /**
   * The application a request is for, by its host: each one has its own subdomain, so a login is never generic.
   * A host that is not one of them, or of an application that does not exist, `ApplicationNotFound`.
   */
  @UseCase()
  async fromHost(host: string): Promise<ApplicationAtHostDTO> {
    const slug = slugAtHost(host)
    const [application] = slug === null ? [] : await this.repository.find({ slug }, { limit: 1 })
    if (!application) {
      throw new ApplicationNotFound()
    }
    return { application: application.toDTO(), url: applicationUrlOf(slug!) }
  }

}
