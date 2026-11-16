import type { PublicStorageAdapter } from '../../../../domain/file-storage/adapter/public-storage-adapter'
import { MemoryStorage }             from '../memory-storage/memory-storage'

export class MemoryPublicStorage extends MemoryStorage implements PublicStorageAdapter {
  url(key: string): string {
    return `memory://public/${key}`
  }
}
