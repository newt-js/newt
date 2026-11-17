import type { PublicStorageAdapter }   from '../../../../domain/file-storage/adapter/public-storage-adapter'
import type { S3PublicStorageOptions } from '../s3-storage-options'
import { S3Storage }                   from '../s3-storage/s3-storage'

export class S3PublicStorage extends S3Storage implements PublicStorageAdapter {

  private readonly publicUrl: string

  private constructor(options: S3PublicStorageOptions) {
    super(options)
    this.publicUrl = options.publicUrl.replace(/\/+$/, '')
  }

  static override async open(options: S3PublicStorageOptions): Promise<S3PublicStorage> {
    return new S3PublicStorage(options).reached(options.bucket)
  }

  url(key: string): string {
    return `${this.publicUrl}/${key}`
  }
}
