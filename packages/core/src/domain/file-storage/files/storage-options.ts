import type { PublicStorageAdapter } from '../adapter/public-storage-adapter'
import type { StorageAdapter }       from '../adapter/storage-adapter'

export type StorageOptions = {
  private?: StorageAdapter
  public?: PublicStorageAdapter
}
