import type { EmailMessage } from '../../../domain/email/email-message'
import type { EmailSender }  from '../../../domain/email/email-sender'

/** Keeps the emails instead of sending them, for a test to read: the first sent, first. */
export class MemoryEmail implements EmailSender {

  readonly sent: EmailMessage[] = []

  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message)
  }

}
