import type { DownloadUrlOptions }   from '../../../../domain/file-storage/adapter/download-url-options'
import type { OpenFile }             from '../../../../domain/file-storage/adapter/open-file'
import type { PutOptions }           from '../../../../domain/file-storage/adapter/put-options'
import type { StorageAdapter }       from '../../../../domain/file-storage/adapter/storage-adapter'
import type { StoredFile }           from '../../../../domain/file-storage/adapter/stored-file'
import type { UploadAddress }        from '../../../../domain/file-storage/adapter/upload-address'
import type { UploadAddressOptions } from '../../../../domain/file-storage/adapter/upload-address-options'
import { contentDisposition }        from '../../../../domain/file-storage/content-disposition/content-disposition'
import { mediaType }                 from '../../../../domain/file-storage/media-type/media-type'
import { toBytes }                   from '../to-bytes/to-bytes'

type Kept = { bytes: Uint8Array<ArrayBuffer>, contentType: string | null }

export class MemoryStorage implements StorageAdapter {
  protected readonly kept = new Map<string, Kept>()

  async put(key: string, body: Blob | Uint8Array<ArrayBuffer> | string, { contentType }: PutOptions): Promise<StoredFile> {
    const bytes = await toBytes(body)
    this.kept.set(key, { bytes, contentType })
    return { size: bytes.byteLength, contentType }
  }

  async open(key: string): Promise<OpenFile | null> {
    const kept = this.kept.get(key)
    if (!kept) {
      return null
    }
    return { size: kept.bytes.byteLength, contentType: kept.contentType, stream: new Blob([kept.bytes]).stream() }
  }

  async head(key: string, bytes: number): Promise<Uint8Array | null> {
    return this.kept.get(key)?.bytes.slice(0, bytes) ?? null
  }

  async stat(key: string): Promise<StoredFile | null> {
    const kept = this.kept.get(key)
    return kept ? { size: kept.bytes.byteLength, contentType: kept.contentType } : null
  }

  async delete(key: string): Promise<void> {
    this.kept.delete(key)
  }

  async uploadUrl(key: string, { contentType, size }: UploadAddressOptions): Promise<UploadAddress> {
    return { url: `memory://upload/${key}?type=${encodeURIComponent(contentType)}&size=${size}`, headers: { 'content-type': contentType } }
  }

  async signedUrl(key: string, { contentType, disposition, filename }: DownloadUrlOptions): Promise<string> {
    return `memory://download/${key}?type=${encodeURIComponent(contentType)}&disposition=${encodeURIComponent(contentDisposition(contentType, disposition, filename))}`
  }

  async send(address: string, init?: RequestInit): Promise<Response> {
    const url = new URL(address)
    const key = url.pathname.slice(1)
    if (url.host === 'upload' && init?.method === 'PUT') {
      const contentType = url.searchParams.get('type')!
      if (mediaType(new Headers(init.headers).get('content-type') ?? '') !== mediaType(contentType)) {
        return new Response(null, { status: 415 })
      }
      const bytes = await new Response(init.body).bytes() as Uint8Array<ArrayBuffer>
      if (bytes.byteLength !== Number(url.searchParams.get('size'))) {
        return new Response(null, { status: 403 })
      }
      await this.put(key, bytes, { contentType })
      return new Response(null, { status: 200 })
    }
    const kept = this.kept.get(key)
    if (url.host !== 'download' || !kept) {
      return new Response(null, { status: 404 })
    }
    return new Response(kept.bytes, { headers: { 'content-type': url.searchParams.get('type')!, 'content-disposition': url.searchParams.get('disposition')! } })
  }
}
