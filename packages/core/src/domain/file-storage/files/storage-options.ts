import { PublicStorageAdapter } from '../adapter/public-storage-adapter'
import { StorageAdapter }       from '../adapter/storage-adapter'

export type StorageOptions = {
  private?: StorageAdapter
  public?: PublicStorageAdapter
}
