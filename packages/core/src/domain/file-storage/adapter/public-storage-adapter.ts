import { StorageAdapter } from './storage-adapter'

export interface PublicStorageAdapter extends StorageAdapter {
  url(key: string): string
}
