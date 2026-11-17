import type { PublicStorageAdapter } from '../../../../domain/file-storage/adapter/public-storage-adapter'
import { contentDisposition }        from '../../../../domain/file-storage/content-disposition/content-disposition'
import type { LocalStorageOptions }  from '../local-storage-options'
import { LocalStorage }              from '../local-storage/local-storage'

export class LocalPublicStorage extends LocalStorage implements PublicStorageAdapter {

  static override async open(options: LocalStorageOptions): Promise<LocalPublicStorage> {
    const storage = new LocalPublicStorage(options)
    await storage.prepared()
    return storage
  }

  url(key: string): string {
    return `${this.baseUrl}/${key}`
  }

  protected override async serveUnsigned(key: string): Promise<Response> {
    const stored = await this.stat(key)
    const contentType = stored?.contentType ?? 'application/octet-stream'
    return this.serve(key, {
      'content-type': contentType,
      'content-disposition': contentDisposition(contentType, 'inline'),
      'cache-control': 'public, max-age=86400',
    })
  }
}
