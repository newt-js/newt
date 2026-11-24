import type { EmailFrom } from './email-from'

/** An email to send: its text always, and its HTML for who shows it. */
export type EmailMessage = {
  /** One address, or several: each as it is, `ana@example.com`, with no name. */
  to: string | string[]
  from?: EmailFrom | undefined
  subject: string
  text: string
  html?: string | undefined
  replyTo?: string | undefined
}
