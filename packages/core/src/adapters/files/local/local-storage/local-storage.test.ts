import { afterAll }                from 'bun:test'
import { describe }                from 'bun:test'
import { expect }                  from 'bun:test'
import { test }                    from 'bun:test'
import { mkdtempSync }             from 'node:fs'
import { readdirSync }             from 'node:fs'
import { rmSync }                  from 'node:fs'
import { writeFileSync }           from 'node:fs'
import { tmpdir }                  from 'node:os'
import { join }                    from 'node:path'
// --------------------------------------------------------
import { describeStorageContract } from '../../../../domain/file-storage/contract/describe-storage-contract/describe-storage-contract'
import { LocalStorage }            from './local-storage'

const SECRET = 'a secret that is long enough for it'

const folders: string[] = []
const newFolder = () => {
  const folder = mkdtempSync(join(tmpdir(), 'newt-local-storage-'))
  folders.push(folder)
  return folder
}
afterAll(() => folders.forEach(folder => rmSync(folder, { recursive: true, force: true })))

const answering = (handler: LocalStorage['handler']) => (address: string, init?: RequestInit) => handler(new Request(address, init))
const open = (clock?: { now(): Date }, folder = newFolder()) =>
  LocalStorage.open({ folder, baseUrl: 'http://app.test/api/files', secret: SECRET, clock })

describeStorageContract('LocalStorage', {
  open: () => open(),
  send: (storage, address, init) => storage.handler(new Request(address, init)),
})

describe('LocalStorage, on its own', () => {
  test('a secret too short is refused', async () => {
    await expect(LocalStorage.open({ folder: newFolder(), baseUrl: 'http://app.test/files', secret: 'short' })).rejects.toThrow('32 characters')
  })

  test('an address stops working once it expired', async () => {
    let time = Date.parse('2026-01-01T10:00:00Z')
    const storage = await open({ now: () => new Date(time) })
    const send = answering(storage.handler)
    await storage.put('a', 'hello', { contentType: 'text/plain' })
    const address = await storage.signedUrl('a', { expiresIn: 60, contentType: 'text/plain' })

    expect((await send(address)).status).toBe(200)
    time += 61_000
    expect((await send(address)).status).toBe(403)
  })

  test('an address changed in any word is refused', async () => {
    const storage = await open()
    const send = answering(storage.handler)
    await storage.put('a', 'hello', { contentType: 'text/plain' })
    const address = await storage.signedUrl('a', { expiresIn: 60, contentType: 'text/plain' })

    expect((await send(address.replace('/a?', '/b?'))).status).toBe(403)
    expect((await send(address.replace('text%2Fplain', 'text%2Fhtml'))).status).toBe(403)
    expect((await send(address.replace(/signature=.{4}/, 'signature=0000'))).status).toBe(403)
  })

  test('an address to read does not upload, nor one to upload read', async () => {
    const storage = await open()
    const send = answering(storage.handler)
    await storage.put('a', 'hello', { contentType: 'text/plain' })

    const read = await storage.signedUrl('a', { expiresIn: 60, contentType: 'text/plain' })
    const put = await storage.uploadUrl('a', { expiresIn: 60, contentType: 'text/plain', size: 1 })

    expect((await send(read, { method: 'PUT', body: 'x', headers: { 'content-type': 'text/plain' } })).status).toBe(403)
    expect((await send(put.url)).status).toBe(403)
  })

  test('a private file has no address without a signature', async () => {
    const storage = await open()
    await storage.put('a', 'hello', { contentType: 'text/plain' })

    expect((await storage.handler(new Request('http://app.test/api/files/a'))).status).toBe(403)
  })

  test('a key that leaves the folder is no file', async () => {
    const storage = await open()

    for (const path of ['..a/b', 'a/.hidden', '.types/a', '.parts/a', 'a%2F..%2F..%2Fb']) {
      expect((await storage.handler(new Request(`http://app.test/api/files/${path}`))).status).toBe(404)
    }
  })

  test('serves and receives at the root of a host of its own', async () => {
    const storage = await LocalStorage.open({ folder: newFolder(), baseUrl: 'http://files.test/', secret: SECRET })
    await storage.put('a', 'hello', { contentType: 'text/plain' })
    const upload = await storage.uploadUrl('b', { expiresIn: 60, contentType: 'text/plain', size: 2 })

    expect(await storage.signedUrl('a', { expiresIn: 60, contentType: 'text/plain' })).toStartWith('http://files.test/a?')
    expect((await storage.handler(new Request(await storage.signedUrl('a', { expiresIn: 60, contentType: 'text/plain' })))).status).toBe(200)
    expect((await storage.handler(new Request(upload.url, { method: 'PUT', body: 'hi', headers: { 'content-type': 'text/plain' } }))).status).toBe(200)
    expect((await storage.stat('b'))?.size).toBe(2)
  })

  test('an upload is held to the type signed', async () => {
    const storage = await open()
    const address = await storage.uploadUrl('a', { expiresIn: 60, contentType: 'image/png', size: 1 })

    const response = await storage.handler(new Request(address.url, { method: 'PUT', body: 'x', headers: { 'content-type': 'text/html' } }))

    expect(response.status).toBe(415)
    expect(await storage.stat('a')).toBeNull()
  })

  test('an upload of another length is refused, and leaves nothing, said or not', async () => {
    const folder = newFolder()
    const storage = await open(undefined, folder)
    const address = await storage.uploadUrl('a', { expiresIn: 60, contentType: 'text/plain', size: 4 })
    const headers = { 'content-type': 'text/plain' }

    const told = await storage.handler(new Request(address.url, { method: 'PUT', body: 'too long', headers }))
    const stream = new Blob(['too long']).stream()
    const untold = await storage.handler(new Request(address.url, { method: 'PUT', body: stream, headers }))

    const short = await storage.handler(new Request(address.url, { method: 'PUT', body: new Blob(['abc']).stream(), headers }))

    expect([told.status, untold.status, short.status]).toEqual([413, 413, 400])
    expect(await storage.stat('a')).toBeNull()
    expect(readdirSync(join(folder, '.parts'))).toEqual([])
  })

  test('a put that cannot be kept leaves nothing behind', async () => {
    const folder = newFolder()
    const storage = await open(undefined, folder)
    writeFileSync(join(folder, 'a'), 'in the way')

    await expect(storage.put('a/b', 'hello', { contentType: 'text/plain' })).rejects.toThrow()

    expect(await storage.stat('a/b')).toBeNull()
    expect(readdirSync(join(folder, '.parts'))).toEqual([])
  })

  test('what it serves never runs on the application\'s origin', async () => {
    const storage = await open()
    await storage.put('a', '<script>alert(1)</script>', { contentType: 'text/html' })

    const response = await storage.handler(new Request(await storage.signedUrl('a', { expiresIn: 60, contentType: 'text/html' })))

    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-security-policy')).toContain('sandbox')
    expect(response.headers.get('content-disposition')).toBe('attachment')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
