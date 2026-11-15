import { S3Client }        from 'bun'
import { afterAll }        from 'bun:test'
import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { PublicFiles }     from '../../../../domain/file-storage/files/public-files/public-files'
import { S3PublicStorage } from './s3-public-storage'

const url = process.env.S3_TEST_URL ? new URL(process.env.S3_TEST_URL) : null
const options = url && {
  accessKeyId: decodeURIComponent(url.username),
  secretAccessKey: decodeURIComponent(url.password),
  endpoint: url.origin,
  bucket: url.pathname.slice(1),
}

describe.skipIf(!options)('S3PublicStorage', () => {
  const prefix = `public-${crypto.randomUUID()}`
  const written: string[] = []
  afterAll(() => Promise.all(written.map(key => new S3Client(options!).delete(key))))

  test('a public file has one address, under where it is read from', async () => {
    const storage = await S3PublicStorage.open({ ...options!, publicUrl: 'https://cdn.example.com/' })

    expect(storage.url('boards/avatar/a')).toBe('https://cdn.example.com/boards/avatar/a')
  })

  test('a page or an SVG kept is only ever downloaded from the bucket, an image shown', async () => {
    const files = new PublicFiles(await S3PublicStorage.open({ ...options!, publicUrl: 'https://cdn.example.com/' }), prefix)
    const bucket = new S3Client(options!)
    written.push(`${prefix}/svg`, `${prefix}/png`)
    await files.put('svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', { contentType: 'image/svg+xml' })
    await files.put('png', new Uint8Array([0x89, 0x50, 0x4E, 0x47]), { contentType: 'image/png' })

    const served = (key: string) => fetch(bucket.presign(`${prefix}/${key}`, { method: 'GET', expiresIn: 60 }))

    expect((await served('svg')).headers.get('content-disposition')).toBe('attachment')
    expect((await served('png')).headers.get('content-disposition')).toBe('inline')
  })

  test('a page or an SVG a client uploaded is only ever downloaded from the bucket too', async () => {
    const files = new PublicFiles(await S3PublicStorage.open({ ...options!, publicUrl: 'https://cdn.example.com/' }), prefix)
    const bucket = new S3Client(options!)
    const page = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    written.push(`${prefix}/uploaded`)

    const address = await files.uploadUrl('uploaded', { expiresIn: 60, contentType: 'image/svg+xml', size: page.byteLength })
    const sent = await fetch(address.url, { method: 'PUT', body: page, headers: address.headers })
    const served = await fetch(bucket.presign(`${prefix}/uploaded`, { method: 'GET', expiresIn: 60 }))

    expect(sent.ok).toBe(true)
    expect(served.headers.get('content-disposition')).toBe('attachment')
  })
})
