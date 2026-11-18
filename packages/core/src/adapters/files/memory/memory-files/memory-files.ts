import type { FilesAdapter } from '../../../../application/data/files-adapter'
import { MemoryStorage }     from '../memory-storage/memory-storage'

/** A context's files in memory, configured or not: lost on stop. */
export function memoryFiles(): FilesAdapter {
  return { open: async () => ({ private: new MemoryStorage() }) }
}
