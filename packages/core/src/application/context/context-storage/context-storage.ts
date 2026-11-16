import type { ContextStorage } from '../../../domain/file-storage/files/context-storage'
import { PrivateFiles }        from '../../../domain/file-storage/files/private-files/private-files'
import { PublicFiles }         from '../../../domain/file-storage/files/public-files/public-files'
import type { StorageOptions } from '../../../domain/file-storage/files/storage-options'

export function contextStorage(options: StorageOptions | undefined, context: string): ContextStorage {
  const missing = (kind: string) => new Error(`The context '${context}' was given no ${kind} storage: ContextBaseOptions.storage.${kind}`)
  const adapters = {
    private: options?.private,
    public: options?.public,
  }
  return {
    get private() {
      if (!adapters.private) {
        throw missing('private')
      }
      return new PrivateFiles(adapters.private, context)
    },
    get public() {
      if (!adapters.public) {
        throw missing('public')
      }
      return new PublicFiles(adapters.public, context)
    },
  }
}
