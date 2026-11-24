import type { EmailMessage } from '../../../domain/email/email-message'
import type { EmailSender }  from '../../../domain/email/email-sender'
import { log }               from '../../platform/log/log'

/** Writes the emails to the log instead of sending them, links and all: only for development. */
export class ConsoleEmail implements EmailSender {

  async send({ to, subject, text }: EmailMessage): Promise<void> {
    log.info(`[email] to ${[to].flat().join(', ')}: ${subject}\n${text}`)
  }

}
