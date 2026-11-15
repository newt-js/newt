import { afterAll }      from 'bun:test'
import { beforeAll }     from 'bun:test'
import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { mkdtemp }       from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
// --------------------------------------------------------
import { serveFrontend } from './serve-frontend'

let folder: string

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), 'newt-frontend-'))
  await Bun.write(join(folder, 'index.html'), '<div id="root"></div>')
  await Bun.write(join(folder, 'assets/app.js'), 'console.log(1)')
  await Bun.write(join(folder, 'consent.html'), 'consent')
})

afterAll(() => rm(folder, { recursive: true }))

const get = (path: string) => serveFrontend(folder)(new Request(`http://app.test${path}`))

const hashOf = (script: string) => `'sha256-${new Bun.CryptoHasher('sha256').update(script).digest('base64')}'`

describe('serveFrontend', () => {
  test('hands out a file that exists, and the frontend for any other address, whose router decides', async () => {
    expect(await (await get('/assets/app.js')).text()).toBe('console.log(1)')
    expect(await (await get('/some/address/the/router/knows')).text()).toBe('<div id="root"></div>')
    expect(await (await get('/../../etc/passwd')).text()).toBe('<div id="root"></div>')
  })

  test('every page refuses to be framed, with its CSP; any other file needs not', async () => {
    for (const path of ['/consent', '/index.html', '/consent.html']) {
      const response = await get(path)
      expect(response.headers.get('x-frame-options')).toBe('DENY')
      expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    }
    expect((await get('/assets/app.js')).headers.get('x-frame-options')).toBeNull()
  })

  test('is a 503 while the frontend is not built', async () => {
    expect((await serveFrontend(join(folder, 'missing'))(new Request('http://app.test/'))).status).toBe(503)
  })

  test('a page changed since is read again: its new scripts\' hashes', async () => {
    const own = await mkdtemp(join(tmpdir(), 'newt-frontend-csp-'))
    try {
      const serveIt = serveFrontend(own)
      await Bun.write(join(own, 'index.html'), '<script>one()</script>')
      const before = (await serveIt(new Request('http://app.test/'))).headers.get('content-security-policy')!
      await Bun.sleep(5)
      await Bun.write(join(own, 'index.html'), '<script>two()</script>')
      const after = (await serveIt(new Request('http://app.test/'))).headers.get('content-security-policy')!

      expect(before).toContain(hashOf('one()'))
      expect(after).toContain(hashOf('two()'))
      expect(after).not.toContain(hashOf('one()'))
    } finally {
      await rm(own, { recursive: true })
    }
  })

  test('under a prefix, a path names the file at what follows it', async () => {
    expect(await (await serveFrontend(folder, undefined, '/backoffice')(new Request('http://app.test/backoffice/assets/app.js'))).text()).toBe('console.log(1)')
  })
})
