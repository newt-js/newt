/** An email, as plain text. */
export type Email = { to: string, subject: string, text: string }

/** Sends an email. For now, to the console: how auth sends mail is still to decide (auth.md §5.4). */
export function sendEmail({ to, subject, text }: Email): void {
  console.log(`[email] to ${to}: ${subject}\n${text}`)
}
