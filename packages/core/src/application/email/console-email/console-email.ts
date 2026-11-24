import type { EmailMessage } from '../../../domain/email/email-message'
import type { EmailSender }  from '../../../domain/email/email-sender'
import { log }               from '../../platform/log/log'

/** Writes the emails to the log instead of sending them, links and all: only for development. */
export class ConsoleEmail implements EmailSender {

  async send({ to, from, subject, text }: EmailMessage): Promise<void> {
    const sender = from?.name ?? from?.address
    log.info(`[email] to ${[to].flat().join(', ')}${sender ? ` from ${sender}` : ''}: ${subject}\n${text}`)
  }

}
