import { describe }                from 'bun:test'
import { expect }                  from 'bun:test'
import { test }                    from 'bun:test'
// --------------------------------------------------------
import { describeStorageContract } from '../../../../domain/file-storage/contract/describe-storage-contract/describe-storage-contract'
import { S3Storage }               from './s3-storage'

const url = process.env.S3_TEST_URL ? new URL(process.env.S3_TEST_URL) : null
const options = url && {
  accessKeyId: decodeURIComponent(url.username),
  secretAccessKey: decodeURIComponent(url.password),
  endpoint: url.origin,
  bucket: url.pathname.slice(1),
}

if (!options) {
  test.skip('S3Storage runs against a bucket: set S3_TEST_URL=http://key:secret@host:port/bucket', () => {})
} else {
  describeStorageContract('S3Storage', { open: () => S3Storage.open(options) })

  describe('S3Storage', () => {
    test('a bucket that is not there is said when it opens, not at the first file', async () => {
      await expect(S3Storage.open({ ...options, bucket: `none-${crypto.randomUUID()}` })).rejects.toThrow('cannot be reached')
    })

    test('credentials it refuses are said when it opens too', async () => {
      await expect(S3Storage.open({ ...options, secretAccessKey: 'not-the-secret' })).rejects.toThrow('cannot be reached')
    })

    test('an upload address that expired is refused', async () => {
      const storage = await S3Storage.open(options)
      const key = `expired-${crypto.randomUUID()}`
      const address = await storage.uploadUrl(key, { expiresIn: 1, contentType: 'text/plain', size: 4 })

      await Bun.sleep(2100)

      expect((await fetch(address.url, { method: 'PUT', body: 'late', headers: address.headers })).status).toBe(403)
      expect(await storage.stat(key)).toBeNull()
    })

    test('a stream of no length said is refused, as its length cannot be held to', async () => {
      const storage = await S3Storage.open(options)
      const key = `stream-${crypto.randomUUID()}`
      const address = await storage.uploadUrl(key, { expiresIn: 60, contentType: 'text/plain', size: 4 })

      expect((await fetch(address.url, { method: 'PUT', body: new Blob(['long enough']).stream(), headers: address.headers })).ok).toBe(false)
      expect(await storage.stat(key)).toBeNull()
    })

    test('an upload address asks for the disposition what it keeps is served with, a page only ever downloaded', async () => {
      const storage = await S3Storage.open(options)

      expect((await storage.uploadUrl('a', { expiresIn: 60, contentType: 'text/html', size: 1 })).headers).toEqual({ 'content-type': 'text/html', 'content-disposition': 'attachment' })
      expect((await storage.uploadUrl('a', { expiresIn: 60, contentType: 'image/png', size: 1 })).headers).toEqual({ 'content-type': 'image/png', 'content-disposition': 'inline' })
    })
  })
}
