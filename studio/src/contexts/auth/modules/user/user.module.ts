import { Module }             from '@newt-js/core'
import type { Page }          from '@newt-js/core'
import type { PageRequest }   from '@newt-js/core'
import { UseCase }            from '@newt-js/core'
import { eventsOf }           from '@newt-js/core'
import { mapPage }            from '@newt-js/core'
import type { ContextBase }   from '@newt-js/core/application'
import type { HttpRouter }    from '@newt-js/core/http'
// --------------------------------------------------------
import { UserNotFound }       from './errors/user-not-found'
import { User_Created }       from './events/user-created'
import type { User_Deps }     from './user.deps'
import { User_Repository }    from './user.repository'
import { registerUserRoutes } from './user.routes'
import type { UserDTO }       from './user.schema'
import { UserFilter }         from './user.schema'
import type { UserFilterDTO } from './user.schema'
import type { UserSortDTO }   from './user.schema'
import { UserId }             from './value-objects/user-id'

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
