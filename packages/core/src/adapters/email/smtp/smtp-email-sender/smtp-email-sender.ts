import { createTransport }   from 'nodemailer'
// --------------------------------------------------------
import type { EmailMessage } from '../../../../domain/email/email-message'
import type { EmailSender }  from '../../../../domain/email/email-sender'
import { parsedFrom }        from '../parsed-from/parsed-from'

export type SmtpEmailOptions = {
  /** `smtp://user:password@host:587`, or `smtps://` for TLS from the start. */
  url: string
  /** Who the emails that do not say it are from: `Shop <hello@shop.com>`. */
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
  private readonly from: { name: string, address: string }

  constructor({ url, from, timeoutMs = TIMEOUT_MS }: SmtpEmailOptions) {
    const parsedSender = parsedFrom(from)
    if (!parsedSender) {
      throw new Error('EMAIL_FROM is not an address, as Shop <hello@shop.com>: see .env.example')
    }
    this.from = parsedSender
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

  async send({ to, from, subject, text, html, replyTo }: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: { name: from?.name ?? this.from.name, address: from?.address ?? this.from.address },
      to: [to].flat().map(only),
      subject,
      text,
      ...html === undefined ? {} : { html },
      ...replyTo === undefined ? {} : { replyTo: only(replyTo) },
    })
  }

}
