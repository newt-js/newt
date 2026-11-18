import type { DatabaseAdapter } from '../../../../application/data/database-adapter'
import { MemoryDatabase }       from '../memory-database/memory-database'

/** A context's database in memory, configured or not: lost on stop. */
export function memoryDatabase(): DatabaseAdapter {
  return { open: async () => new MemoryDatabase() }
}
