import { S3Client }                  from 'bun'
// --------------------------------------------------------
import type { DownloadUrlOptions }   from '../../../../domain/file-storage/adapter/download-url-options'
import type { OpenFile }             from '../../../../domain/file-storage/adapter/open-file'
import type { PutOptions }           from '../../../../domain/file-storage/adapter/put-options'
import type { StorageAdapter }       from '../../../../domain/file-storage/adapter/storage-adapter'
import type { StoredFile }           from '../../../../domain/file-storage/adapter/stored-file'
import type { UploadAddress }        from '../../../../domain/file-storage/adapter/upload-address'
import type { UploadAddressOptions } from '../../../../domain/file-storage/adapter/upload-address-options'
import { contentDisposition }        from '../../../../domain/file-storage/content-disposition/content-disposition'
import { isMissing }                 from '../is-missing/is-missing'
import { orNull }                    from '../or-null/or-null'
import type { S3StorageOptions }     from '../s3-storage-options'
import { withSignedLength }          from '../with-signed-length/with-signed-length'

export class S3Storage implements StorageAdapter {

  protected readonly client: S3Client
  private readonly secretAccessKey: string

  protected constructor(options: S3StorageOptions) {
    this.client = new S3Client(options)
    this.secretAccessKey = options.secretAccessKey
  }

  static async open(options: S3StorageOptions): Promise<S3Storage> {
    return new S3Storage(options).reached(options.bucket)
  }

  async put(key: string, body: Blob | Uint8Array<ArrayBuffer> | string, { contentType }: PutOptions): Promise<StoredFile> {
    const size = await this.client.write(key, body, { type: contentType, contentDisposition: contentDisposition(contentType, 'inline') })
    return { size, contentType }
  }

  async open(key: string): Promise<OpenFile | null> {
    const stored = await this.stat(key)
    return stored && { ...stored, stream: this.client.file(key).stream() }
  }

  async head(key: string, bytes: number): Promise<Uint8Array | null> {
    return orNull(this.client.file(key).slice(0, bytes).bytes().catch((error: unknown) => {
      if ((error as { code?: string }).code === 'InvalidRange') {
        return new Uint8Array()
      }
      throw error
    }))
  }

  async stat(key: string): Promise<StoredFile | null> {
    const stats = await orNull(this.client.stat(key))
    return stats && { size: stats.size, contentType: stats.type || null }
  }

  async delete(key: string): Promise<void> {
    await this.client.delete(key)
  }

  async uploadUrl(key: string, { expiresIn, contentType, size }: UploadAddressOptions): Promise<UploadAddress> {
    const headers = { 'content-type': contentType, 'content-disposition': contentDisposition(contentType, 'inline') }
    return { url: withSignedLength(this.client.presign(key, { method: 'PUT', expiresIn }), size, headers, this.secretAccessKey), headers }
  }

  async signedUrl(key: string, { expiresIn, contentType, disposition, filename }: DownloadUrlOptions): Promise<string> {
    return this.client.presign(key, {
      method: 'GET',
      expiresIn,
      type: contentType,
      contentDisposition: contentDisposition(contentType, disposition, filename),
    })
  }

  protected async reached(bucket: string): Promise<this> {
    try {
      await this.client.file('newt-storage-check').slice(0, 1).bytes()
      return this
    } catch (error) {
      if (isMissing(error)) {
        return this
      }
      throw new Error(`The bucket '${bucket}' cannot be reached: ${(error as Error).message}`, { cause: error })
    }
  }
}
