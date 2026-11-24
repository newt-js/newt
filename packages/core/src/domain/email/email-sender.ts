import type { EmailMessage } from './email-message'

/** Sends emails. It rejects when one could not be handed over, so that a worker's job tries again. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>
}
