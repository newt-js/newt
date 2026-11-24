import type { EmailAdapter } from '../../../../application/data/email-adapter'
import { envNameOf }         from '../../../../application/data/env/env'
import { requiredEnv }       from '../../../../application/data/env/env'
import { ConsoleEmail }      from '../../../../application/email/console-email/console-email'
import { MemoryEmail }       from '../../../../application/email/memory-email/memory-email'
import { SmtpEmailSender }   from '../smtp-email-sender/smtp-email-sender'

/**
 * A context's emails sent through the server of SMTP_URL, from <CONTEXT>_EMAIL_FROM or EMAIL_FROM; in memory for its
 * tests, and to the console in development while SMTP_URL is empty.
 */
export function smtpEmail(): EmailAdapter {
  return {
    open: async (context, { place }) => {
      if (place === 'memory') return new MemoryEmail()
      if (!Bun.env.SMTP_URL && Bun.env.NODE_ENV === 'development') return new ConsoleEmail()
      return new SmtpEmailSender({
        url: requiredEnv('SMTP_URL'),
        from: Bun.env[`${envNameOf(context)}_EMAIL_FROM`] || requiredEnv('EMAIL_FROM'),
      })
    },
  }
}
