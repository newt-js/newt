import { Module }                         from '@newt-js/core'
import { UseCase }                        from '@newt-js/core'
import { eventsOf }                       from '@newt-js/core'
import type { ContextBase }               from '@newt-js/core/application'
import type { HttpRouter }                from '@newt-js/core/http'
// --------------------------------------------------------
import { UserCredential_Created }         from './events/user-credential-created'
import { UserCredential }                 from './user-credential'
import type { UserCredential_Deps }       from './user-credential.deps'
import { UserCredential_Repository }      from './user-credential.repository'
import type { UserCredentialPasswordDTO } from './user-credential.schema'
import { UserCredentialPasswordSchema }   from './user-credential.schema'
import type { UserCredentialVerifyDTO }   from './user-credential.schema'
import { UserCredentialVerifySchema }     from './user-credential.schema'
import { UserCredentialKind }             from './value-objects/user-credential-kind'

/** A hash no password matches: checked when there is no credential, as slow. */
const NO_PASSWORD = Bun.password.hash(crypto.randomUUID())

/** How users prove who they are. No route reaches it: auth's sign-in does. */
export class UserCredential_Module extends Module {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
    deps: UserCredential_Deps,
  ): UserCredential_Module {
    const repository = new UserCredential_Repository(base)
    return new UserCredential_Module(base, repository, deps)
  }

  readonly events

  private constructor(
    base: ContextBase,
    private readonly repository: UserCredential_Repository,
    private readonly deps: UserCredential_Deps,
  ) {
    super('userCredential', base.useCaseRunner, deps)
    this.events = eventsOf(base.bus, {
      created: UserCredential_Created,
    })
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
