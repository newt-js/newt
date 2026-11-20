import { Module }                 from '@newt-js/core'
import type { Page }              from '@newt-js/core'
import type { PageRequest }       from '@newt-js/core'
import { UseCase }                from '@newt-js/core'
import { eventsOf }               from '@newt-js/core'
import { mapPage }                from '@newt-js/core'
import type { ContextBase }       from '@newt-js/core/application'
import type { HttpRouter }        from '@newt-js/core/http'
// --------------------------------------------------------
import { SetupClosed }            from './errors/setup-closed'
import { UserNotFound }           from './errors/user-not-found'
import { User_Created }           from './events/user-created'
import { User }                   from './user'
import type { User_Deps }         from './user.deps'
import { User_Repository }        from './user.repository'
import { registerUserRoutes }     from './user.routes'
import type { UserDTO }           from './user.schema'
import { UserFilter }             from './user.schema'
import type { UserFilterDTO }     from './user.schema'
import type { UserFirstAdminDTO } from './user.schema'
import { UserFirstAdminSchema }   from './user.schema'
import type { UserSortDTO }       from './user.schema'
import { ApplicationId }          from './value-objects/application-id'
import { UserId }                 from './value-objects/user-id'

/** The slug of auth's own application, which its first migration creates. */
const AUTH_SLUG = 'auth'

export class User_Module extends Module {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
    deps: User_Deps,
  ): User_Module {
    const repository = new User_Repository(base, deps)
    const module = new User_Module(base, repository, router, deps)
    return module
  }

  readonly events
  readonly routes

  private constructor(
    base: ContextBase,
    private readonly repository: User_Repository,
    router: HttpRouter,
    private readonly deps: User_Deps,
  ) {
    super('user', base.useCaseRunner, deps)
    this.events = eventsOf(base.bus, {
      created: User_Created,
    })
    this.routes = registerUserRoutes(router, this, deps)
  }

  /** The setup: the first user of auth, open while auth has none. */
  @UseCase()
  async createFirstAdmin(input: UserFirstAdminDTO): Promise<UserDTO> {
    const { email, name } = UserFirstAdminSchema.parse(input)
    const [auth] = await this.deps.application.find({ slug: AUTH_SLUG })
    const ofAuth = { applicationId: ApplicationId.from(auth!.id) }
    const [anyone] = await this.repository.find(ofAuth, { limit: 1 })
    if (anyone) {
      throw new SetupClosed()
    }
    const admin = User.create({ application: auth!, email, name })
    // Two setups at once: the guard lines them up, and the second finds the first and leaves.
    await this.repository.persist(admin, {
      guard: ['auth.user.setup'],
      after: async () => {
        if ((await this.repository.find(ofAuth, { limit: 2 })).length > 1) {
          throw new SetupClosed()
        }
      },
    })
    return admin.toDTO()
  }

  @UseCase()
  async get(id: string): Promise<UserDTO> {
    const [user] = await this.repository.find(
      { id: UserId.from(id) },
      { limit: 1 },
    )
    if (!user) {
      throw new UserNotFound()
    }
    return user.toDTO()
  }

  @UseCase()
  async find(
    criteria: UserFilterDTO,
    sort?: UserSortDTO,
  ): Promise<UserDTO[]> {
    const found = await this.repository.find(
      UserFilter.toCriteria(criteria),
      { orderBy: UserFilter.toOrder(sort) },
    )
    return found.map(each => each.toDTO())
  }

  @UseCase()
  async paginate(
    criteria: UserFilterDTO,
    page: PageRequest,
  ): Promise<Page<UserDTO>> {
    const found = await this.repository.paginate(
      UserFilter.toCriteria(criteria),
      page,
      { newestFirst: true },
    )
    return mapPage(found, each => each.toDTO())
  }

}
