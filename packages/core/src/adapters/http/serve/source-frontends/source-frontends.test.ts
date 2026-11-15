import { afterAll }        from 'bun:test'
import { beforeAll }       from 'bun:test'
import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdtemp }         from 'node:fs/promises'
import { rm }              from 'node:fs/promises'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { sourceFrontends } from './source-frontends'

const bundle = {} as Bun.HTMLBundle
let publicFolder: string

beforeAll(async () => {
  publicFolder = await mkdtemp(join(tmpdir(), 'newt-public-'))
  await Bun.write(join(publicFolder, 'robots.txt'), 'robots')
  await Bun.write(join(publicFolder, 'images', 'logo.svg'), '<svg/>')
})

afterAll(async () => {
  await rm(publicFolder, { recursive: true })
})

describe('sourceFrontends', () => {
  test('a bundle at the root takes everything, and its public files their own path', () => {
    const routes = sourceFrontends([{ path: '/', app: bundle, publicFolder, prefix: '' }])

    expect(Object.keys(routes).toSorted()).toEqual(['/*', '/images/logo.svg', '/robots.txt'])
    expect(routes['/*']).toBe(bundle)
    expect((routes['/robots.txt'] as Bun.BunFile).name).toBe(join(publicFolder, 'robots.txt'))
  })

  test('a bundle under a prefix takes the prefix itself too', () => {
    const routes = sourceFrontends([{ path: '/backoffice', app: bundle, prefix: '/backoffice' }])

    expect(routes).toEqual({ '/backoffice': bundle, '/backoffice/*': bundle })
  })

  test('a built frontend, a folder, takes no routes here', () => {
    expect(sourceFrontends([{ path: '/', app: 'dist', publicFolder, prefix: '' }])).toEqual({})
  })
})
