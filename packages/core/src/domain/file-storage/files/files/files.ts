import { OpenFile }         from '../../adapter/open-file'
import { PutOptions }       from '../../adapter/put-options'
import { StorageAdapter }   from '../../adapter/storage-adapter'
import { StoredFile }       from '../../adapter/stored-file'
import { UploadAddress }    from '../../adapter/upload-address'
import { mediaType }        from '../../media-type/media-type'
import { SNIFF_BYTES }      from '../../sniff-type/sniff-type'
import { matchesType }      from '../../sniff-type/sniff-type'
import { assertStorageKey } from '../../storage-key/storage-key'
import { UploadRefusal }    from '../../upload/upload-refusal'
import { UploadRule }       from '../../upload/upload-rule'
import { UploadTooLarge }   from '../../upload/upload-too-large/upload-too-large'
import { UploadUrlOptions } from '../../upload/upload-url-options'

export const DEFAULT_MAX_UPLOAD_BYTES = 1024 * 1024

export abstract class Files<A extends StorageAdapter = StorageAdapter> {
  constructor(protected readonly adapter: A, protected readonly prefix: string) {
    assertStorageKey(prefix)
  }

  abstract in(prefix: string): Files<A>

  put(key: string, body: Blob | Uint8Array<ArrayBuffer> | string, options: PutOptions): Promise<StoredFile> {
    return this.adapter.put(this.full(key), body, options)
  }

  open(key: string): Promise<OpenFile | null> {
    return this.adapter.open(this.full(key))
  }

  stat(key: string): Promise<StoredFile | null> {
    return this.adapter.stat(this.full(key))
  }

  delete(key: string): Promise<void> {
    return this.adapter.delete(this.full(key))
  }

  async uploadUrl(key: string, { maxBytes = DEFAULT_MAX_UPLOAD_BYTES, ...address }: UploadUrlOptions): Promise<UploadAddress> {
    if (!Number.isSafeInteger(address.size) || address.size < 0) {
      throw new Error(`${address.size} is no length of a file`)
    }
    if (address.size > maxBytes) {
      throw new UploadTooLarge(maxBytes)
    }
    return this.adapter.uploadUrl(this.full(key), address)
  }

  async verifyUpload(key: string, { contentType, maxBytes = DEFAULT_MAX_UPLOAD_BYTES }: UploadRule): Promise<UploadRefusal | null> {
    const full = this.full(key)
    const stored = await this.adapter.stat(full)
    if (!stored) {
      return 'missing'
    }
    if (stored.size > maxBytes) {
      return 'too_large'
    }
    if (mediaType(stored.contentType ?? '') !== mediaType(contentType)) {
      return 'wrong_type'
    }
    const head = await this.adapter.head(full, SNIFF_BYTES)
    return head && matchesType(head, contentType) ? null : 'wrong_type'
  }

  protected full(key: string): string {
    const full = `${this.prefix}/${key}`
    assertStorageKey(full)
    return full
  }
}

