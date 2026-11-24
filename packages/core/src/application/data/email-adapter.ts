import type { EmailSender } from '../../domain/email/email-sender'
import type { DataPlace }   from './data-place/data-place'

/** How a context opens what sends its emails, `smtpEmail()`: given its name and where it keeps its data. */
export type EmailAdapter = {
  open(context: string, at: { place: DataPlace }): Promise<EmailSender>
}
