import { afterEach }          from 'bun:test'
import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
import { mkdtemp }            from 'node:fs/promises'
import { rm }                 from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
// --------------------------------------------------------
import { MemoryCluster }      from '../../../../application/cluster/memory-cluster/memory-cluster'
import { ContextBase }        from '../../../../application/context/context-base/context-base'
import type { CapturedLines } from '../../../../application/platform/capture-lines/capture-lines'
import { captureLines }       from '../../../../application/platform/capture-lines/capture-lines'
import { Platform }           from '../../../../application/platform/platform/platform'
import { MemoryDatabase }     from '../../../database/memory/memory-database/memory-database'
import { HttpRouter }         from '../../router/http-router/http-router'
import type { ContextToRun }  from '../run-contexts-options'
import { runContexts }        from './run-contexts'

const platform = new Platform({ cluster: new MemoryCluster() })

let captured: CapturedLines[] = []

afterEach(() => {
  for (const each of captured) {
    each.restore()
  }
  captured = []
})

function context(name: string, log: string[], of = platform): ContextToRun['context'] {
  return {
    name,
    base: new ContextBase({ name, platform: of, database: new MemoryDatabase() }),
    start: () => void log.push(`${name} started`),
    stopWorker: async () => {
      await Bun.sleep(5)
      log.push(`${name} worker stopped`)
    },
    close: async () => void log.push(`${name} closed`),
  }
}

function routerOf(answer: string, path = '/who', prefix = `/${answer}/api`): HttpRouter {
  const router = new HttpRouter({ prefix })
  router.get(path, () => Response.json(answer), { public: true })
  return router
}

describe('runContexts', () => {
  test('serves every context\'s router on one server, with its health by default, starts them all, and stops them the last one first', async () => {
    const log: string[] = []
    const app = runContexts([
      { context: context('auth', log), router: routerOf('auth') },
      { context: context('shop', log), router: routerOf('shop') },
      { context: context('reports', log) },
    ], { signals: false, serve: { port: 0 } })

    expect(await (await fetch(new URL('/shop/api/who', app.server!.url))).json()).toBe('shop')
    expect((await fetch(new URL('/health-check', app.server!.url))).status).toBe(200)
    expect(log).toEqual(['auth started', 'shop started', 'reports started'])

    const url = app.server!.url
    await Promise.all([app.stop(), app.stop()])
    expect(log.slice(3, 6).sort()).toEqual(['auth worker stopped', 'reports worker stopped', 'shop worker stopped'])
    expect(log.slice(6)).toEqual(['reports closed', 'shop closed', 'auth closed'])
    await expect(fetch(new URL('/shop/api/who', url))).rejects.toThrow()
  })

  test('with health: false, it answers no health', async () => {
    const app = runContexts([{ context: context('auth', []), router: routerOf('auth') }], { signals: false, serve: { port: 0, health: false } })

    expect((await fetch(new URL('/health-check', app.server!.url))).status).toBe(404)
    expect((await fetch(new URL('/auth/health-check', app.server!.url))).status).toBe(404)
    await app.stop()
  })

  test('a step that fails keeps none after it from running: every context closes, and then the stop throws', async () => {
    const log: string[] = []
    const broken = (name: string): ContextToRun['context'] => ({
      ...context(name, log),
      stopWorker: async () => {
        throw new Error(`${name}'s worker would not stop`)
      },
      close: async () => {
        throw new Error(`${name} would not close`)
      },
    })
    const theirs = captureLines(platform)
    const unscoped = captureLines()
    captured.push(theirs, unscoped)
    const app = runContexts([context('auth', log), broken('shop'), context('reports', log)].map(each => ({ context: each })), { signals: false })

    const failed = await app.stop().catch((error: unknown) => error)

    expect(log).toEqual(['auth started', 'shop started', 'reports started', 'auth worker stopped', 'reports worker stopped', 'reports closed', 'auth closed'])
    expect((failed as AggregateError).errors.map(String)).toEqual(['Error: shop\'s worker would not stop', 'Error: shop would not close'])
    expect(theirs.said('error')).toEqual([expect.stringContaining('stopping shop\'s worker failed'), expect.stringContaining('closing shop failed')])
    expect(unscoped.lines).toEqual([])
  })

  test('refuses contexts of two platforms before anything starts', () => {
    const log: string[] = []

    expect(() => runContexts([
      { context: context('auth', log), router: routerOf('auth') },
      { context: context('shop', log, new Platform({ cluster: new MemoryCluster() })) },
    ], { signals: false })).toThrow('The contexts auth, shop are not of one platform')
    expect(log).toEqual([])
  })

  test('on SIGTERM it stops them, then ends the process', async () => {
    const script = `
      import { runContexts } from '${join(import.meta.dir, 'run-contexts')}'
      import { Platform } from '${join(import.meta.dir, '../../../../application/platform/platform/platform')}'
      import { MemoryCluster } from '${join(import.meta.dir, '../../../../application/cluster/memory-cluster/memory-cluster')}'
      const base = { platform: new Platform({ cluster: new MemoryCluster() }) }
      const context = name => ({ name, base, start: () => console.log(name, 'started'), stopWorker: async () => {}, close: async () => console.log(name, 'stopped') })
      runContexts([{ context: context('auth') }, { context: context('shop') }])
      process.kill(process.pid, 'SIGTERM')
      setTimeout(() => console.log('still running'), 2000)
    `
    const child = Bun.spawn([process.execPath, '-e', script], { stdout: 'pipe', stderr: 'pipe' })

    expect(await child.exited).toBe(0)
    expect((await new Response(child.stdout).text()).trim().split('\n')).toEqual(['auth started', 'shop started', 'shop stopped', 'auth stopped'])
  })

  test('on SIGTERM it ends the process with 1 when a step of the stop fails, every context closed', async () => {
    const script = `
      import { runContexts } from '${join(import.meta.dir, 'run-contexts')}'
      import { Platform } from '${join(import.meta.dir, '../../../../application/platform/platform/platform')}'
      import { MemoryCluster } from '${join(import.meta.dir, '../../../../application/cluster/memory-cluster/memory-cluster')}'
      const base = { platform: new Platform({ cluster: new MemoryCluster() }) }
      const context = name => ({ name, base, start: () => {}, stopWorker: async () => {}, close: async () => {
        console.log(name, 'closing')
        if (name === 'shop') throw new Error('shop would not close')
      } })
      runContexts([{ context: context('auth') }, { context: context('shop') }])
      process.kill(process.pid, 'SIGTERM')
      setTimeout(() => console.log('still running'), 2000)
    `
    const child = Bun.spawn([process.execPath, '-e', script], { stdout: 'pipe', stderr: 'pipe' })

    expect(await child.exited).toBe(1)
    expect((await new Response(child.stdout).text()).trim().split('\n')).toEqual(['shop closing', 'auth closing'])
  })
})

describe('runContexts, one server for every context', () => {
  test('serves each context\'s routes side by side on one port, with its health and each context\'s, and stops it', async () => {
    const log: string[] = []
    const app = runContexts([
      { context: context('auth', log), router: routerOf('auth', '/session') },
      { context: context('boards', log), router: routerOf('boards', '/boards') },
      { context: context('quiet', log) },
    ], { signals: false, serve: { port: 0, health: true } })
    const at = (path: string) => fetch(new URL(path, app.server!.url))

    expect(await (await at('/auth/api/session')).json()).toBe('auth')
    expect(await (await at('/boards/api/boards')).json()).toBe('boards')
    expect((await at('/health-check')).status).toBe(200)
    expect((await at('/auth/health-check')).status).toBe(200)
    expect((await at('/boards/health-check')).status).toBe(200)
    expect((await at('/quiet/health-check')).status).toBe(404)
    expect((await at('/auth/api/nothing')).status).toBe(404)

    await app.stop()
    expect(await at('/health-check').then(() => 'answered', () => 'closed')).toBe('closed')
    expect(log.slice(3)).toEqual(['auth worker stopped', 'boards worker stopped', 'quiet worker stopped', 'quiet closed', 'boards closed', 'auth closed'])
  })

  test('serves each context\'s app at its base, every page under it, beside its API and its health', async () => {
    const log: string[] = []
    const built = await mkdtemp(join(tmpdir(), 'newt-app-'))
    await Bun.write(join(built, 'index.html'), '<p>the boards app</p>')
    const { default: notes } = await import('../../frontend/fixtures/frontend/index.html')
    const app = runContexts([
      { context: context('notes', log), router: routerOf('notes', '/folders', '/notes/api'), app: notes },
      { context: context('boards', log), router: routerOf('boards', '/boards', '/boards/api'), app: built },
    ], { signals: false, serve: { port: 0, health: true } })
    const at = (path: string) => fetch(new URL(path, app.server!.url))

    for (const path of ['/notes', '/notes/folders/12']) {
      expect(await (await at(path)).text()).toContain('A frontend for serve\'s test')
    }
    for (const path of ['/boards', '/boards/12']) {
      expect(await (await at(path)).text()).toBe('<p>the boards app</p>')
    }
    expect(await (await at('/notes/api/folders')).json()).toBe('notes')
    expect(await (await at('/boards/api/boards')).json()).toBe('boards')
    expect((await at('/notes/api/nothing')).status).toBe(404)
    expect((await at('/boards/api/nothing')).status).toBe(404)
    expect((await at('/notes/health-check')).status).toBe(200)
    expect((await at('/elsewhere')).status).toBe(404)

    await app.stop()
    await rm(built, { recursive: true })
  })

  test("a context's HTML-import app is built and served as a built app: under its CSP, never in a frame, its scripts at its base", async () => {
    const log: string[] = []
    const { default: notes } = await import('../../frontend/fixtures/frontend/index.html')
    const app = runContexts([
      { context: context('notes', log), router: routerOf('notes', '/folders', '/notes/api'), app: notes },
    ], { signals: false, serve: { port: 0 } })
    const at = (path: string) => fetch(new URL(path, app.server!.url))

    const page = await at('/notes/folders/12')
    const script = /src="(\/notes\/[^"]+\.js)"/.exec(await page.text())?.[1]
    expect(page.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(page.headers.get('x-frame-options')).toBe('DENY')
    expect(await (await at(script!)).text()).toContain('ready')

    await app.stop()
  })

  test('a context with a host answers there at its own paths, and with its name too, and never by its name on another host', async () => {
    const log: string[] = []
    const { default: notes } = await import('../../frontend/fixtures/frontend/index.html')
    const app = runContexts([
      { context: context('notes', log), router: routerOf('notes', '/folders', '/notes/api'), app: notes, host: 'Notes.Test' },
      { context: context('auth', log), router: routerOf('auth', '/session', '/auth/api'), host: 'auth.test' },
      { context: context('boards', log), router: routerOf('boards', '/boards', '/boards/api') },
    ], { signals: false, serve: { port: 0, health: true, trustProxy: 1 } })
    const at = (path: string, host?: string, forwarded?: string) => fetch(new URL(path, app.server!.url), {
      headers: { ...host ? { host } : {}, ...forwarded ? { 'x-forwarded-host': forwarded } : {} },
    })

    expect(await (await at('/api/folders', 'notes.test')).json()).toBe('notes')
    expect(await (await at('/api/folders', undefined, 'notes.test')).json()).toBe('notes')
    expect(await (await at('/folders/12', 'notes.test')).text()).toContain('A frontend for serve\'s test')
    expect((await at('/health-check', 'notes.test')).status).toBe(200)
    expect(await (await at('/api/session', 'auth.test')).json()).toBe('auth')
    expect(await (await at('/auth/api/session', 'auth.test')).json()).toBe('auth')
    expect(await (await at('/notes/folders/12', 'notes.test')).text()).toContain('A frontend for serve\'s test')
    expect((await at('/api/boards', 'auth.test')).status).toBe(404)
    expect((await at('/notes/api/folders')).status).toBe(404)
    expect((await at('/%6eotes/api/folders')).status).toBe(404)
    expect((await at('/notes/folders/12')).status).toBe(404)
    expect((await at('/auth/health-check')).status).toBe(404)
    expect(await (await at('/boards/api/boards')).json()).toBe('boards')
    expect((await at('/health-check')).status).toBe(200)

    await app.stop()
  })

  test('a built app at its host answers the paths it was built for, under /<context>', async () => {
    const log: string[] = []
    const built = await mkdtemp(join(tmpdir(), 'newt-app-'))
    await Bun.write(join(built, 'index.html'), '<p>the boards app</p>')
    await Bun.write(join(built, 'assets', 'app.js'), 'console.log("boards")')
    const app = runContexts([
      { context: context('boards', log), router: routerOf('boards', '/boards', '/boards/api'), app: built, host: 'boards.test' },
    ], { signals: false, serve: { port: 0 } })
    const at = (path: string) => fetch(new URL(path, app.server!.url), { headers: { host: 'boards.test' } })

    expect(await (await at('/boards/assets/app.js')).text()).toBe('console.log("boards")')
    expect(await (await at('/assets/app.js')).text()).toBe('console.log("boards")')
    expect(await (await at('/12')).text()).toBe('<p>the boards app</p>')

    await app.stop()
    await rm(built, { recursive: true })
  })

  test('two contexts at one host stop it before anything starts', () => {
    const log: string[] = []

    expect(() => runContexts([
      { context: context('auth', log), router: routerOf('auth', '/session', '/auth/api'), host: 'midominio.com' },
      { context: context('boards', log), router: routerOf('boards', '/boards', '/boards/api'), host: 'MIDOMINIO.com' },
    ], { signals: false, serve: { port: 0 } })).toThrow('auth and boards both answer at the host midominio.com')
    expect(log).toEqual([])
  })

  test('with no context yet, it serves the health on platformWithoutContexts', async () => {
    const app = runContexts([], { signals: false, platformWithoutContexts: platform, serve: { port: 0, health: true } })

    expect((await fetch(new URL('/health-check', app.server!.url))).status).toBe(200)
    await app.stop()
  })

  test('a router that is not under /<context>/api stops it before anything starts', () => {
    const log: string[] = []

    expect(() => runContexts([
      { context: context('sales', log), router: routerOf('sales', '/orders', '/api') },
    ], { signals: false, serve: { port: 0 } })).toThrow('sales\'s router is at /api: a context\'s routes go under /sales/api')
    expect(log).toEqual([])
  })
})
