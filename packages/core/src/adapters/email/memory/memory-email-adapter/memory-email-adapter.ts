import type { EmailAdapter } from '../../../../application/data/email-adapter'
import { MemoryEmail }       from '../../../../application/email/memory-email/memory-email'

/** A context's emails kept in memory, configured or not: none goes out. */
export function memoryEmail(): EmailAdapter {
  return { open: async () => new MemoryEmail() }
}
