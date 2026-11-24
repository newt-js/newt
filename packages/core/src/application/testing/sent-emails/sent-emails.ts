import type { EmailMessage } from '../../../domain/email/email-message'
import type { ContextBase }  from '../../context/context-base/context-base'
import { MemoryEmail }       from '../../email/memory-email/memory-email'

/** The emails a context sent, when it keeps them in memory, as a backend started with `data: 'memory'` does. */
export function sentEmails(base: Pick<ContextBase, 'name' | 'email'>): EmailMessage[] {
  if (!(base.email instanceof MemoryEmail)) {
    throw new Error(`The context '${base.name}' does not keep its emails in memory`)
  }
  return base.email.sent
}
