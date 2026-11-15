import { DownloadUrlOptions }   from './download-url-options'
import { OpenFile }             from './open-file'
import { PutOptions }           from './put-options'
import { StoredFile }           from './stored-file'
import { UploadAddress }        from './upload-address'
import { UploadAddressOptions } from './upload-address-options'

export interface StorageAdapter {
  put(key: string, body: Blob | Uint8Array<ArrayBuffer> | string, options: PutOptions): Promise<StoredFile>
  open(key: string): Promise<OpenFile | null>
  head(key: string, bytes: number): Promise<Uint8Array | null>
  stat(key: string): Promise<StoredFile | null>
  delete(key: string): Promise<void>
  uploadUrl(key: string, options: UploadAddressOptions): Promise<UploadAddress>
  signedUrl(key: string, options: DownloadUrlOptions): Promise<string>
}
