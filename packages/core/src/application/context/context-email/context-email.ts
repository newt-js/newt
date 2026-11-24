import type { EmailSender } from '../../../domain/email/email-sender'

/** What sends a context's emails: without one, it is found missing when the first is sent. */
export function contextEmail(given: EmailSender | undefined, context: string): EmailSender {
  return given ?? {
    send: async () => {
      throw new Error(`The context '${context}' was given nothing to send emails with: ContextBaseOptions.email`)
    },
  }
}
