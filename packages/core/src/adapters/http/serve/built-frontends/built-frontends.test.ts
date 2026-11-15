import { afterAll }       from 'bun:test'
import { beforeAll }      from 'bun:test'
import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { mkdtemp }        from 'node:fs/promises'
import { rm }             from 'node:fs/promises'
import { tmpdir }         from 'node:os'
import { join }           from 'node:path'
// --------------------------------------------------------
import { builtFrontends } from './built-frontends'

const server = {} as Bun.Server<undefined>
let web: string
let backoffice: string

beforeAll(async () => {
  web = await mkdtemp(join(tmpdir(), 'newt-built-web-'))
  backoffice = await mkdtemp(join(tmpdir(), 'newt-built-backoffice-'))
  await Bun.write(join(web, 'index.html'), '<p>the web</p>')
  await Bun.write(join(backoffice, 'index.html'), '<p>the backoffice</p>')
})

afterAll(async () => {
  for (const each of [web, backoffice]) {
    await rm(each, { recursive: true })
  }
})

const at = (path: string) => new Request(`http://shop.test${path}`)

describe('builtFrontends', () => {
  test('each address goes to the frontend of the longest prefix it is under', async () => {
    const frontend = builtFrontends([{ path: '/', app: web, prefix: '' }, { path: '/backoffice', app: backoffice, prefix: '/backoffice' }], false)

    expect(await (await frontend(at('/backoffice'), server)).text()).toBe('<p>the backoffice</p>')
    expect(await (await frontend(at('/backoffice/orders'), server)).text()).toBe('<p>the backoffice</p>')
    expect(await (await frontend(at('/backofficer'), server)).text()).toBe('<p>the web</p>')
    expect(await (await frontend(at('/'), server)).text()).toBe('<p>the web</p>')
  })

  test('an address under none is a 404; a frontend that is a bundle is not one of them', async () => {
    const bundle = {} as Bun.HTMLBundle
    const frontend = builtFrontends([{ path: '/backoffice', app: backoffice, prefix: '/backoffice' }, { path: '/', app: bundle, prefix: '' }], false)

    expect((await frontend(at('/elsewhere'), server)).status).toBe(404)
  })
})
