import { createTransport }   from 'nodemailer'
// --------------------------------------------------------
import type { EmailMessage } from '../../../../domain/email/email-message'
import type { EmailSender }  from '../../../../domain/email/email-sender'

export type SmtpEmailOptions = {
  /** `smtp://user:password@host:587`, or `smtps://` for TLS from the start. */
  url: string
  /** `Shop <hello@shop.com>`. */
  from: string
  /** How long the server has for each answer. */
  timeoutMs?: number | undefined
}

const TIMEOUT_MS = 10_000
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

/** An address and nothing else: never read as a list, whatever it holds. */
const only = (address: string) => ({ name: '', address })

/** Whether the connection must go on over TLS: always, but on this machine or when the url says not to. */
function mustUpgrade(url: URL): boolean {
  return url.protocol === 'smtp:' && !LOOPBACK.has(url.hostname) && !url.searchParams.has('requireTLS')
}

/** Sends emails through an SMTP server, with nodemailer. */
export class SmtpEmailSender implements EmailSender {

  private readonly transport: ReturnType<typeof createTransport>
  private readonly from: string

  constructor({ url, from, timeoutMs = TIMEOUT_MS }: SmtpEmailOptions) {
    this.from = from
    const parsed = URL.parse(url)
    if (!parsed || !['smtp:', 'smtps:'].includes(parsed.protocol)) {
      throw new Error('SMTP_URL is not an smtp:// or smtps:// address: see .env.example')
    }
    this.transport = createTransport({
      url,
      ...mustUpgrade(parsed) ? { requireTLS: true } : {},
      connectionTimeout: timeoutMs,
      greetingTimeout: timeoutMs,
      socketTimeout: timeoutMs,
      disableFileAccess: true,
      disableUrlAccess: true,
    })
  }

  async send({ to, subject, text, html, replyTo }: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: [to].flat().map(only),
      subject,
      text,
      ...html === undefined ? {} : { html },
      ...replyTo === undefined ? {} : { replyTo: only(replyTo) },
    })
  }

}
