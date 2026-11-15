import { afterAll }           from 'bun:test'
import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
import { mkdtempSync }        from 'node:fs'
import { rmSync }             from 'node:fs'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
// --------------------------------------------------------
import { PublicFiles }        from '../../../../domain/file-storage/files/public-files/public-files'
import { LocalPublicStorage } from './local-public-storage'

const SECRET = 'a secret that is long enough for it'

const folders: string[] = []
const newFolder = () => {
  const folder = mkdtempSync(join(tmpdir(), 'newt-local-public-storage-'))
  folders.push(folder)
  return folder
}
afterAll(() => folders.forEach(folder => rmSync(folder, { recursive: true, force: true })))

describe('LocalPublicStorage', () => {
  const openPublic = () => LocalPublicStorage.open({ folder: newFolder(), baseUrl: 'http://app.test/api/files', secret: SECRET })

  test('a file is read at its one address, kept a while by caches', async () => {
    const files = new PublicFiles(await openPublic(), 'boards').in('avatar')
    await files.put('a', new Uint8Array([0x89, 0x50, 0x4E, 0x47]), { contentType: 'image/png' })

    expect(files.url('a')).toBe('http://app.test/api/files/boards/avatar/a')
    const storage = (files as unknown as { adapter: LocalPublicStorage }).adapter
    const response = await storage.handler(new Request(files.url('a')))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('content-disposition')).toBe('inline')
    expect(response.headers.get('cache-control')).toContain('public')
  })

  test('a page or an SVG someone uploaded is only ever downloaded', async () => {
    const storage = await openPublic()
    await storage.put('page', '<script>alert(1)</script>', { contentType: 'text/html' })
    await storage.put('drawing', '<svg onload="alert(1)"/>', { contentType: 'image/svg+xml' })

    for (const key of ['page', 'drawing']) {
      expect((await storage.handler(new Request(storage.url(key)))).headers.get('content-disposition')).toBe('attachment')
    }
  })

  test('uploading still takes a signature', async () => {
    const storage = await openPublic()

    const response = await storage.handler(new Request(storage.url('a'), { method: 'PUT', body: 'x', headers: { 'content-type': 'text/plain' } }))

    expect(response.status).toBe(403)
  })
})
