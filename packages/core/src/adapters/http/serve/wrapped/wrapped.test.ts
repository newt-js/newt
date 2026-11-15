import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { Handler }  from '../handler'
import { wrapped }  from './wrapped'

const server = {} as Bun.Server<undefined>
const request = new Request('http://shop.test/')
const noted = (handler: Handler): Handler => async (req, srv) => new Response(`noted ${await (await handler(req, srv)).text()}`)

describe('wrapped', () => {
  test('a route that is a handler, and each handler of one by method, go through the note', async () => {
    const routes = wrapped({ '/a': () => new Response('a'), '/b': { GET: () => new Response('b'), POST: () => new Response('posted') } }, noted) as Record<string, unknown>

    expect(await (await (routes['/a'] as Handler)(request, server)).text()).toBe('noted a')
    const b = routes['/b'] as Record<string, Handler>
    expect(await (await b.GET!(request, server)).text()).toBe('noted b')
    expect(await (await b.POST!(request, server)).text()).toBe('noted posted')
  })

  test('a fixed answer, a file or a method\'s fixed answer is left as it is', () => {
    const fixed = new Response('fixed')
    const file = Bun.file(import.meta.path)
    const routes = wrapped({ '/fixed': fixed, '/file': file, '/methods': { GET: fixed } }, noted) as Record<string, unknown>

    expect(routes['/fixed']).toBe(fixed)
    expect(routes['/file']).toBe(file)
    expect((routes['/methods'] as Record<string, unknown>).GET).toBe(fixed)
  })
})
