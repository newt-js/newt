import { PublicStorageAdapter } from '../../adapter/public-storage-adapter'
import { Files }                from '../files/files'

export class PublicFiles extends Files<PublicStorageAdapter> {
  in(prefix: string): PublicFiles {
    return new PublicFiles(this.adapter, this.full(prefix))
  }

  url(key: string): string {
    return this.adapter.url(this.full(key))
  }
}
