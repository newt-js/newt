import type { DownloadUrlOptions } from '../../adapter/download-url-options'
import { Files }                   from '../files/files'

export class PrivateFiles extends Files {
  in(prefix: string): PrivateFiles {
    return new PrivateFiles(this.adapter, this.full(prefix))
  }

  signedUrl(key: string, options: DownloadUrlOptions): Promise<string> {
    return this.adapter.signedUrl(this.full(key), options)
  }
}
