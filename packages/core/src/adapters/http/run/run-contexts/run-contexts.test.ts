import { afterEach }      from 'bun:test'
import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { ContextBase }    from '../../../../application/context/context-base/context-base'
import { CapturedLines }  from '../../../../application/platform/capture-lines/capture-lines'
import { captureLines }   from '../../../../application/platform/capture-lines/capture-lines'
import { Platform }       from '../../../../application/platform/platform/platform'
import { MemoryCluster }  from '../../../cluster/memory/memory-cluster/memory-cluster'
import { MemoryDatabase } from '../../../database/memory/memory-database/memory-database'
import { HttpRouter }     from '../../router/http-router/http-router'
import { ContextToRun }   from '../run-contexts-options'
import { runContexts }    from './run-contexts'

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

function routerOf(answer: string, path = '/who'): HttpRouter {
  const router = new HttpRouter()
  router.get(path, () => Response.json(answer), { public: true })
  return router
}

describe('runContexts', () => {
  test('serves each context that is served, starts them all, and stops them the last one first', async () => {
    const log: string[] = []
    const app = runContexts([
      { context: context('auth', log), serve: { port: 0, routers: [routerOf('auth')], health: true } },
      { context: context('shop', log), serve: { port: 0, routers: [routerOf('shop')] } },
      { context: context('reports', log) },
    ], { signals: false })

    expect(Object.keys(app.servers)).toEqual(['auth', 'shop'])
    expect(await (await fetch(new URL('/api/who', app.servers.shop!.url))).json()).toBe('shop')
    expect((await fetch(new URL('/api/health', app.servers.auth!.url))).status).toBe(200)
    expect(log).toEqual(['auth started', 'shop started', 'reports started'])

    const url = app.servers.auth!.url
    await Promise.all([app.stop(), app.stop()])
    expect(log.slice(3, 6).sort()).toEqual(['auth worker stopped', 'reports worker stopped', 'shop worker stopped'])
    expect(log.slice(6)).toEqual(['reports closed', 'shop closed', 'auth closed'])
    await expect(fetch(new URL('/api/who', url))).rejects.toThrow()
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
      { context: context('auth', log), serve: { port: 0, routers: [routerOf('auth')] } },
      { context: context('shop', log, new Platform({ cluster: new MemoryCluster() })) },
    ], { signals: false })).toThrow('The contexts auth, shop are not of one platform')
    expect(log).toEqual([])
  })

  test('on SIGTERM it stops them, then ends the process', async () => {
    const script = `
      import { runContexts } from '${join(import.meta.dir, 'run-contexts')}'
      import { Platform } from '${join(import.meta.dir, '../../../../application/platform/platform/platform')}'
      import { MemoryCluster } from '${join(import.meta.dir, '../../../cluster/memory/memory-cluster/memory-cluster')}'
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
      import { MemoryCluster } from '${join(import.meta.dir, '../../../cluster/memory/memory-cluster/memory-cluster')}'
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
  test('serves each context\'s routes side by side on one port, with its health, and stops it', async () => {
    const log: string[] = []
    const app = runContexts([
      { context: context('auth', log), router: routerOf('auth', '/session') },
      { context: context('boards', log), router: routerOf('boards', '/boards') },
      { context: context('quiet', log) },
    ], { signals: false, serve: { port: 0, health: true } })
    const at = (path: string) => fetch(new URL(path, app.server!.url))

    expect(await (await at('/api/session')).json()).toBe('auth')
    expect(await (await at('/api/boards')).json()).toBe('boards')
    expect((await at('/api/health')).status).toBe(200)
    expect((await at('/api/nothing')).status).toBe(404)
    expect(app.servers).toEqual({})

    await app.stop()
    expect(await at('/api/health').then(() => 'answered', () => 'closed')).toBe('closed')
    expect(log.slice(3)).toEqual(['auth worker stopped', 'boards worker stopped', 'quiet worker stopped', 'quiet closed', 'boards closed', 'auth closed'])
  })

  test('two contexts that take one path stop it before anything starts', () => {
    const log: string[] = []

    expect(() => runContexts([
      { context: context('auth', log), router: routerOf('auth', '/things/:id') },
      { context: context('boards', log), router: routerOf('boards', '/things/:thingId') },
    ], { signals: false, serve: { port: 0 } })).toThrow('auth and boards both take /api/things/:thingId')
    expect(log).toEqual([])
  })
})
