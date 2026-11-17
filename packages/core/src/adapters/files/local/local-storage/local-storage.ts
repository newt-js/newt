import { createHmac }                from 'node:crypto'
import { timingSafeEqual }           from 'node:crypto'
import { mkdir }                     from 'node:fs/promises'
import { rename }                    from 'node:fs/promises'
import { rm }                        from 'node:fs/promises'
import { dirname }                   from 'node:path'
import { join }                      from 'node:path'
// --------------------------------------------------------
import type { Clock }                from '../../../../domain/clock/clock'
import { systemClock }               from '../../../../domain/clock/system-clock/system-clock'
import type { DownloadUrlOptions }   from '../../../../domain/file-storage/adapter/download-url-options'
import type { OpenFile }             from '../../../../domain/file-storage/adapter/open-file'
import type { PutOptions }           from '../../../../domain/file-storage/adapter/put-options'
import type { StorageAdapter }       from '../../../../domain/file-storage/adapter/storage-adapter'
import type { StoredFile }           from '../../../../domain/file-storage/adapter/stored-file'
import type { UploadAddress }        from '../../../../domain/file-storage/adapter/upload-address'
import type { UploadAddressOptions } from '../../../../domain/file-storage/adapter/upload-address-options'
import { contentDisposition }        from '../../../../domain/file-storage/content-disposition/content-disposition'
import { mediaType }                 from '../../../../domain/file-storage/media-type/media-type'
import { assertStorageKey }          from '../../../../domain/file-storage/storage-key/storage-key'
import { NEVER_RUNS }                from '../answer/answer'
import { answer }                    from '../answer/answer'
import type { LocalStorageOptions }  from '../local-storage-options'

const MIN_SECRET = 32
const TYPES = '.types'
const PARTS = '.parts'
const OCTETS = 'application/octet-stream'
const KEPT = '~'

export class LocalStorage implements StorageAdapter {

  protected readonly folder: string
  protected readonly baseUrl: string
  private readonly secret: string
  private readonly clock: Clock
  private readonly basePath: string

  protected constructor(options: LocalStorageOptions) {
    if (options.secret.length < MIN_SECRET) {
      throw new Error(`The secret of a LocalStorage has ${MIN_SECRET} characters or more`)
    }
    this.folder = options.folder
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.basePath = new URL(this.baseUrl).pathname.replace(/\/+$/, '')
    this.secret = options.secret
    this.clock = options.clock ?? systemClock
  }

  static async open(options: LocalStorageOptions): Promise<LocalStorage> {
    const storage = new LocalStorage(options)
    await storage.prepared()
    return storage
  }

  async put(key: string, body: Blob | Uint8Array<ArrayBuffer> | string, { contentType }: PutOptions): Promise<StoredFile> {
    const part = this.partPath()
    const size = await Bun.write(part, body)
    try {
      await this.keep(part, key, contentType)
    } catch (error) {
      await rm(part, { force: true })
      throw error
    }
    return { size, contentType }
  }

  async open(key: string): Promise<OpenFile | null> {
    const stored = await this.stat(key)
    return stored && { ...stored, stream: Bun.file(this.path(key)).stream() }
  }

  async head(key: string, bytes: number): Promise<Uint8Array | null> {
    const file = Bun.file(this.path(key))
    return await file.exists() ? file.slice(0, bytes).bytes() : null
  }

  async stat(key: string): Promise<StoredFile | null> {
    const file = Bun.file(this.path(key))
    if (!await file.exists()) {
      return null
    }
    const type = Bun.file(this.typePath(key))
    return { size: file.size, contentType: await type.exists() ? await type.text() : null }
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true })
    await rm(this.typePath(key), { force: true })
  }

  async uploadUrl(key: string, { expiresIn, contentType, size }: UploadAddressOptions): Promise<UploadAddress> {
    return { url: this.signed('PUT', key, expiresIn, { type: contentType, size: String(size) }), headers: { 'content-type': contentType } }
  }

  async signedUrl(key: string, { expiresIn, contentType, disposition, filename }: DownloadUrlOptions): Promise<string> {
    return this.signed('GET', key, expiresIn, { type: contentType, disposition: contentDisposition(contentType, disposition, filename) })
  }

  readonly handler = async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    if (!url.pathname.startsWith(`${this.basePath}/`)) {
      return answer(404)
    }
    const key = url.pathname.slice(this.basePath.length + 1)
    try {
      assertStorageKey(key)
    } catch {
      return answer(404)
    }
    if (request.method === 'PUT') {
      return this.isSigned('PUT', key, url) ? this.receive(request, key, url) : answer(403)
    }
    if (request.method !== 'GET') {
      return answer(405)
    }
    if (url.searchParams.has('signature')) {
      return this.isSigned('GET', key, url) ? this.serveSigned(key, url) : answer(403)
    }
    return this.serveUnsigned(key)
  }

  protected async serveUnsigned(_key: string): Promise<Response> {
    return answer(403)
  }

  protected async prepared(): Promise<void> {
    await mkdir(join(this.folder, PARTS), { recursive: true })
  }

  protected async serve(key: string, headers: Record<string, string>): Promise<Response> {
    const file = Bun.file(this.path(key))
    if (!await file.exists()) {
      return answer(404)
    }
    return new Response(file.stream(), { headers: { ...NEVER_RUNS, 'content-length': String(file.size), ...headers } })
  }

  private serveSigned(key: string, url: URL): Promise<Response> {
    return this.serve(key, {
      'content-type': url.searchParams.get('type') ?? OCTETS,
      'content-disposition': url.searchParams.get('disposition') ?? 'attachment',
      'cache-control': 'no-store',
    })
  }

  private async receive(request: Request, key: string, url: URL): Promise<Response> {
    const contentType = url.searchParams.get('type')!
    if (mediaType(request.headers.get('content-type') ?? '') !== mediaType(contentType)) {
      return answer(415)
    }
    const expected = Number(url.searchParams.get('size'))
    if (Number(request.headers.get('content-length') ?? 0) > expected) {
      return answer(413)
    }

    const part = this.partPath()
    const writer = Bun.file(part).writer()
    let size = 0
    try {
      if (request.body) {
        for await (const chunk of request.body) {
          size += chunk.byteLength
          if (size > expected) {
            await writer.end()
            await rm(part, { force: true })
            return answer(413)
          }
          await writer.write(chunk)
        }
      }
      await writer.end()
      if (size !== expected) {
        await rm(part, { force: true })
        return answer(400)
      }
      await this.keep(part, key, contentType)
      return answer(200)
    } catch (error) {
      await Promise.resolve(writer.end()).catch(() => undefined)
      await rm(part, { force: true })
      throw error
    }
  }

  private async keep(part: string, key: string, contentType: string): Promise<void> {
    await mkdir(dirname(this.path(key)), { recursive: true })
    await Bun.write(this.typePath(key), contentType)
    await rename(part, this.path(key))
  }

  private signed(method: 'GET' | 'PUT', key: string, expiresIn: number, params: Record<string, string>): string {
    const expires = String(Math.floor(this.clock.now().getTime() / 1000) + expiresIn)
    const query = new URLSearchParams({ ...params, expires })
    query.set('signature', this.signature(method, key, query))
    return `${this.baseUrl}/${key}?${query}`
  }

  private isSigned(method: 'GET' | 'PUT', key: string, url: URL): boolean {
    const given = Buffer.from(url.searchParams.get('signature') ?? '', 'hex')
    const expected = Buffer.from(this.signature(method, key, url.searchParams), 'hex')
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return false
    }
    return Number(url.searchParams.get('expires')) * 1000 > this.clock.now().getTime()
  }

  private signature(method: string, key: string, query: URLSearchParams): string {
    const said = [...query].filter(([name]) => name !== 'signature').sort(([a], [b]) => a.localeCompare(b))
    return createHmac('sha256', this.secret).update(JSON.stringify([method, key, said])).digest('hex')
  }

  private path(key: string): string {
    return join(this.folder, key + KEPT)
  }

  private typePath(key: string): string {
    return join(this.folder, TYPES, key + KEPT)
  }

  private partPath(): string {
    return join(this.folder, PARTS, crypto.randomUUID())
  }
}
