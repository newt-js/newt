import { StorageAdapter } from '../adapter/storage-adapter'

export type StorageFixture<S extends StorageAdapter = StorageAdapter> = {
  open(): Promise<S>
  close?(storage: S): Promise<void>
  send?(storage: S, address: string, init?: RequestInit): Promise<Response>
}
