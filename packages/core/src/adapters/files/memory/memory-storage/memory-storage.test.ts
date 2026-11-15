import { describeStorageContract } from '../../../../domain/file-storage/contract/describe-storage-contract/describe-storage-contract'
import { MemoryStorage }           from './memory-storage'

describeStorageContract('MemoryStorage', {
  open: async () => new MemoryStorage(),
  send: (storage, address, init) => storage.send(address, init),
})
