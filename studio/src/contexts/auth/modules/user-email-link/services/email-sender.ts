/** An email, as plain text. */
export type Email = { to: string, subject: string, text: string }

/** A link's token in an email's text, its first characters kept to tell links apart. */
const TOKEN = /#token=([\w-]{4})[\w-]*/g

/**
 * Sends an email. For now, to the console: how auth sends mail is still to decide (auth.md §5.4).
 * A link's token is hidden, since logs are kept: `AUTH_LOG_EMAIL_LINKS=true` shows it, to try links locally.
 */
export function sendEmail({ to, subject, text }: Email): void {
  const shown = Bun.env.AUTH_LOG_EMAIL_LINKS === 'true' ? text : text.replace(TOKEN, '#token=$1…')
  console.log(`[email] to ${to}: ${subject}\n${shown}`)
}
