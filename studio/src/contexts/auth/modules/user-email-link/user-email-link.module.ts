import { Module }                          from '@newt-js/core'
import { UseCase }                         from '@newt-js/core'
import { eventsOf }                        from '@newt-js/core'
import type { ContextBase }                from '@newt-js/core/application'
import type { HttpRouter }                 from '@newt-js/core/http'
// --------------------------------------------------------
import { InvalidUserEmailLink }            from './errors/invalid-user-email-link'
import { UserEmailLink_Created }           from './events/user-email-link-created'
import { sendEmail }                       from './services/email-sender'
import { UserEmailLink }                   from './user-email-link'
import type { UserEmailLink_Deps }         from './user-email-link.deps'
import { UserEmailLink_Repository }        from './user-email-link.repository'
import { registerUserEmailLinkRoutes }     from './user-email-link.routes'
import type { UserEmailLinkDTO }           from './user-email-link.schema'
import type { UserEmailLinkRedeemableDTO } from './user-email-link.schema'
import { UserEmailLinkRedeemableSchema }   from './user-email-link.schema'
import { registerUserEmailLinkWorkers }    from './user-email-link.workers'
import { UserEmailLinkId }                 from './value-objects/user-email-link-id'

/** Where auth's pages are: the link takes its token in the fragment, which browsers never send to a server. */
const PUBLIC_URL = Bun.env.PUBLIC_URL ?? 'http://localhost:3000'

/** A token too long to guess needs no slow hash: SHA-256, as the tokens of sessions. */
function hashOf(token: string): string {
  return new Bun.CryptoHasher('sha256').update(token).digest('hex')
}

/** Links sent by email that work once and expire. */
export class UserEmailLink_Module extends Module {

  static initialize(
    base: ContextBase,
    router: HttpRouter,
    deps: UserEmailLink_Deps,
  ): UserEmailLink_Module {
    const repository = new UserEmailLink_Repository(base, deps)
    const module = new UserEmailLink_Module(base, repository, router, deps)
    registerUserEmailLinkWorkers(module, deps)
    return module
  }

  readonly events
  readonly routes

  private constructor(
    private readonly base: ContextBase,
    private readonly repository: UserEmailLink_Repository,
    router: HttpRouter,
    private readonly deps: UserEmailLink_Deps,
  ) {
    super('userEmailLink', base.useCaseRunner, deps)
    this.events = eventsOf(base.bus, {
      created: UserEmailLink_Created,
    })
    this.routes = registerUserEmailLinkRoutes(router, this)
  }

  /** Tells someone given access, by email, with the link to set its password. Run when access is granted. */
  @UseCase()
  async sendAccessEmail(userId: string): Promise<void> {
    const user = await this.deps.user.get(userId)
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
    const link = UserEmailLink.access({ user, tokenHash: hashOf(token), now: this.base.clock.now() })
    // Sent before the link is saved: a worker's first save takes its event as received, so a send that failed
    // after it would never be retried. A save that fails after sending is retried with a new link; the sent one never works.
    sendEmail({
      to: user.email!,
      subject: `You have access to ${user.application.name}`,
      text: `Set your password to sign in to ${user.application.name}: ${PUBLIC_URL}/access#token=${token}`,
    })
    await this.repository.persist(link)
  }

  /** The link of a token while it works: for that purpose, unused and in time. Any other token, `InvalidUserEmailLink`. */
  @UseCase()
  async redeemable(input: UserEmailLinkRedeemableDTO): Promise<UserEmailLinkDTO> {
    const parsed = UserEmailLinkRedeemableSchema.safeParse(input)
    const [link] = parsed.success
      ? await this.repository.find({ tokenHash: hashOf(parsed.data.token), purpose: parsed.data.purpose }, { limit: 1 })
      : []
    if (!link?.isUsable(this.base.clock.now())) {
      throw new InvalidUserEmailLink()
    }
    return link.toDTO()
  }

  /** Spends a link once what it was for is done. */
  @UseCase()
  async markUsed(id: string): Promise<void> {
    const [link] = await this.repository.find({ id: UserEmailLinkId.from(id) }, { limit: 1 })
    if (link) {
      link.use(this.base.clock.now())
      await this.repository.persist(link)
    }
  }

}
