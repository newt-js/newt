import { DuplicateValue }                      from '@newt-js/core'
import { Module }                              from '@newt-js/core'
import { UseCase }                             from '@newt-js/core'
import { eventsOf }                            from '@newt-js/core'
import type { ContextBase }                    from '@newt-js/core/application'
import type { HttpRouter }                     from '@newt-js/core/http'
// --------------------------------------------------------
import { InvalidUserEmailLink }                from '../user-email-link/errors/invalid-user-email-link'
import { SetupClosed }                         from './errors/setup-closed'
import { UserCredential_Created }              from './events/user-credential-created'
import { UserCredential_SetFromEmailLink }     from './events/user-credential-set-from-email-link'
import { UserCredential }                      from './user-credential'
import type { UserCredential_Deps }            from './user-credential.deps'
import { UserCredential_Repository }           from './user-credential.repository'
import { registerUserCredentialRoutes }        from './user-credential.routes'
import type { UserCredentialFromEmailLinkDTO } from './user-credential.schema'
import { UserCredentialFromEmailLinkSchema }   from './user-credential.schema'
import type { UserCredentialPasswordDTO }      from './user-credential.schema'
import { UserCredentialPasswordSchema }        from './user-credential.schema'
import type { UserCredentialVerifyDTO }        from './user-credential.schema'
import { UserCredentialVerifySchema }          from './user-credential.schema'
import { registerUserCredentialWorkers }       from './user-credential.workers'
import { UserCredentialKind }                  from './value-objects/user-credential-kind'
import { UserEmailLinkId }                     from './value-objects/user-email-link-id'
import { UserId }                              from './value-objects/user-id'

/** A hash no password matches: checked when there is no credential, as slow. */
const NO_PASSWORD = Bun.password.hash(crypto.randomUUID())

/** The slug of auth's own application: its users are its admins. */
const AUTH_SLUG = 'auth'

/** How users prove who they are. Only the setup reaches it by a route; sign-in, from within. */
export class UserCredential_Module extends Module {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
    deps: UserCredential_Deps,
  ): UserCredential_Module {
    const repository = new UserCredential_Repository(base)
    const module = new UserCredential_Module(base, repository, router, deps)
    registerUserCredentialWorkers(module)
    return module
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
      setFromEmailLink: UserCredential_SetFromEmailLink,
    })
    this.routes = registerUserCredentialRoutes(router, this, base.rateLimits)
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
    const ofAdmins = { userId: { in: admins.map(each => UserId.from(each.id)) } }
    const [withPassword] = await this.repository.find(ofAdmins, { limit: 1 })
    if (withPassword) {
      throw new SetupClosed()
    }
    const secretHash = await Bun.password.hash(password)
    // Two passwords at once: the guard lines them up, and the second finds the first and leaves.
    await this.repository.persist(UserCredential.password({ userId, secretHash }), {
      guard: ['auth.userCredential.setup'],
      after: async () => {
        if ((await this.repository.find(ofAdmins, { limit: 2 })).length > 1) {
          throw new SetupClosed()
        }
      },
    })
  }

  /**
   * The first password of someone given access, from the link of its email. The link works once:
   * a user has one password at most, so a second try finds one and is refused as a spent link.
   */
  @UseCase()
  async setPasswordFromEmailLink(input: UserCredentialFromEmailLinkDTO): Promise<void> {
    const { token, password } = UserCredentialFromEmailLinkSchema.parse(input)
    const link = await this.deps.userEmailLink.redeemable({ token, purpose: 'access' })
    const secretHash = await Bun.password.hash(password)
    const userId = UserId.from(link.user.id)
    const credential = UserCredential.passwordFromEmailLink({ userId, secretHash, emailLinkId: UserEmailLinkId.from(link.id) })
    try {
      await this.repository.persist(credential)
    } catch (error) {
      throw error instanceof DuplicateValue ? new InvalidUserEmailLink() : error
    }
  }

  /**
   * Once a password is set from a link, the link is spent. One write per worker: a worker's first save takes its event
   * as received, so a second write that failed after it would never be retried.
   */
  @UseCase()
  async spendEmailLink(emailLinkId: string): Promise<void> {
    await this.deps.userEmailLink.markUsed(emailLinkId)
  }

  /** Once a password is set from a link, the email it was sent to is the user's. */
  @UseCase()
  async verifyEmailOfLink(userId: string): Promise<void> {
    await this.deps.user.verifyEmail(userId)
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
