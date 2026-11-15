import { afterAll }     from 'bun:test'
import { beforeAll }    from 'bun:test'
import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { rmSync }       from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { PrivateFiles } from '../../../../domain/file-storage/files/private-files/private-files'
import { LocalStorage } from '../../../files/local/local-storage/local-storage'
import { HttpRouter }   from './http-router'

const MAX = 1024
const folder = mkdtempSync(join(tmpdir(), 'newt-local-mounted-'))
let router: HttpRouter
let files: PrivateFiles

beforeAll(async () => {
  const storage = await LocalStorage.open({ folder, baseUrl: 'http://shop.test/api/files', secret: 'a secret that is long enough for it' })
  router = new HttpRouter()
  router.get('/files/*', storage.handler, { public: true })
  router.put('/files/*', storage.handler, { public: true, crossOrigin: true, maxBodyBytes: MAX })
  files = new PrivateFiles(storage, 'boards').in('attachment')
})

afterAll(() => rmSync(folder, { recursive: true, force: true }))

const send = (address: string, init?: RequestInit) => router.answer(new Request(address, init))!

describe('LocalStorage mounted on a router', () => {
  test('a browser uploads and reads back through its routes', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2])
    const address = await files.uploadUrl('a', { expiresIn: 60, contentType: 'image/png', size: png.byteLength, maxBytes: MAX })

    const put = await send(address.url, { method: 'PUT', body: png, headers: { ...address.headers, 'sec-fetch-site': 'cross-site' } })
    const verdict = await files.verifyUpload('a', { contentType: 'image/png', maxBytes: MAX })
    const read = await send(await files.signedUrl('a', { expiresIn: 60, contentType: 'image/png', filename: 'a.png' }))

    expect([put.status, verdict]).toEqual([200, null])
    expect(new Uint8Array(await read.arrayBuffer())).toEqual(png)
    expect(read.headers.get('content-disposition')).toStartWith('attachment; filename="a.png"')
    expect(read.headers.get('cache-control')).toBe('no-store')
  })

  test('a body past what the route takes is refused by the router too', async () => {
    const address = await files.uploadUrl('big', { expiresIn: 60, contentType: 'text/plain', size: MAX + 1, maxBytes: MAX * 4 })

    expect((await send(address.url, { method: 'PUT', body: new Blob(['x'.repeat(MAX + 1)]).stream(), headers: address.headers })).status).toBe(413)
  })
})
