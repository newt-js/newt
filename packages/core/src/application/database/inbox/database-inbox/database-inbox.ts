import { Clock }          from '../../../../domain/clock/clock'
import { DuplicateValue } from '../../../../domain/errors/duplicate-value/duplicate-value'
import { Records }        from '../../../../domain/repository/records/records'
import { Inbox }          from '../../../../domain/use-case/inbox'
import { ReactionRun }    from '../../../../domain/use-case/reaction-run'
import { Database }       from '../../database'
import { InboxRow }       from '../inbox-row'

export class DatabaseInbox implements Inbox {

  private records: Records<InboxRow> | undefined

  constructor(private readonly database: Database, private readonly clock: Clock) {}

  async has(reaction: ReactionRun): Promise<boolean> {
    return await this.rows().count({ id: this.idOf(reaction) }) > 0
  }

  async receive(reaction: ReactionRun): Promise<boolean> {
    reaction.received = true
    this.database.afterRollback(() => {
      reaction.received = false
    })
    try {
      await this.rows().insert({ id: this.idOf(reaction), receivedAt: this.clock.now().toISOString() })
      return true
    } catch (error) {
      if (error instanceof DuplicateValue) {
        return false
      }
      throw error
    }
  }

  async purge(before: string): Promise<void> {
    await this.rows().deleteMany({ receivedAt: { lt: before } })
  }

  private rows(): Records<InboxRow> {
    return this.records ??= this.database.records<InboxRow>('newt_inbox')
  }

  private idOf(reaction: ReactionRun): string {
    return `${reaction.event}:${reaction.queue}`
  }
}
