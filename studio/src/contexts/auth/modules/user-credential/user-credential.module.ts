import { Module }                         from '@newt-js/core'
import { UseCase }                        from '@newt-js/core'
import { eventsOf }                       from '@newt-js/core'
import type { ContextBase }               from '@newt-js/core/application'
import type { HttpRouter }                from '@newt-js/core/http'
// --------------------------------------------------------
import { SetupClosed }                    from './errors/setup-closed'
import { UserCredential_Created }         from './events/user-credential-created'
import { UserCredential }                 from './user-credential'
import type { UserCredential_Deps }       from './user-credential.deps'
import { UserCredential_Repository }      from './user-credential.repository'
import { registerUserCredentialRoutes }   from './user-credential.routes'
import type { UserCredentialPasswordDTO } from './user-credential.schema'
import { UserCredentialPasswordSchema }   from './user-credential.schema'
import type { UserCredentialVerifyDTO }   from './user-credential.schema'
import { UserCredentialVerifySchema }     from './user-credential.schema'
import { UserCredentialKind }             from './value-objects/user-credential-kind'
import { UserId }                         from './value-objects/user-id'

/** A hash no password matches: checked when there is no credential, as slow. */
const NO_PASSWORD = Bun.password.hash(crypto.randomUUID())

/** How users prove who they are. Only the setup reaches it by a route; sign-in, from within. */
/** The slug of auth's own application: its users are its admins. */
const AUTH_SLUG = 'auth'

export class UserCredential_Module extends Module {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
    deps: UserCredential_Deps,
  ): UserCredential_Module {
    const repository = new UserCredential_Repository(base)
    return new UserCredential_Module(base, repository, router, deps)
  }

  readonly events
  readonly routes

  private constructor(
    base: ContextBase,
    private readonly repository: UserCredential_Repository,
    router: HttpRouter,
    private readonly deps: UserCredential_Deps,
  ) {
    super('userCredential', base.useCaseRunner, deps)
    this.events = eventsOf(base.bus, {
      created: UserCredential_Created,
    })
    this.routes = registerUserCredentialRoutes(router, this)
  }

  /** Sets the user's password, or changes the one it has. */
  @UseCase()
  async setPassword(input: UserCredentialPasswordDTO): Promise<void> {
    const { userId, password } = UserCredentialPasswordSchema.parse(input)
    await this.deps.user.get(userId)
    const secretHash = await Bun.password.hash(password)
    const [current] = await this.repository.find(
      { userId, kind: UserCredentialKind.password },
      { limit: 1 },
    )
    if (current) {
      current.changeSecret(secretHash)
    }
    const credential = current
      ?? UserCredential.password({ userId, secretHash })
    await this.repository.persist(credential)
  }

  /** The setup's second step: the first admin's password, while none of auth has one. */
  @UseCase()
  async setFirstAdminPassword(input: UserCredentialPasswordDTO): Promise<void> {
    const { userId, password } = UserCredentialPasswordSchema.parse(input)
    const user = await this.deps.user.get(userId)
    if (user.application.slug !== AUTH_SLUG) {
      throw new SetupClosed()
    }
    const admins = await this.deps.user.find({
      applicationId: user.application.id,
    })
    const [withPassword] = await this.repository.find(
      { userId: { in: admins.map(each => UserId.from(each.id)) } },
      { limit: 1 },
    )
    if (withPassword) {
      throw new SetupClosed()
    }
    const secretHash = await Bun.password.hash(password)
    await this.repository.persist(UserCredential.password({ userId, secretHash }))
  }

  /** Whether the password is the user's: false too for a user without one. */
  @UseCase()
  async verify(input: UserCredentialVerifyDTO): Promise<boolean> {
    const { userId, password } = UserCredentialVerifySchema.parse(input)
    const [credential] = await this.repository.find(
      { userId, kind: UserCredentialKind.password },
      { limit: 1 },
    )
    const hash = credential?.secretHash ?? await NO_PASSWORD
    const matches = await Bun.password.verify(password, hash)
    return matches && credential !== undefined
  }

}
