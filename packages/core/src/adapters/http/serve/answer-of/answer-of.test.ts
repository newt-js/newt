import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { HttpRouter } from '../../router/http-router/http-router'
import { answerOf }   from './answer-of'

function routerAt(prefix: string, path: string, says: string): HttpRouter {
  const router = new HttpRouter({ prefix })
  router.get(path, () => new Response(says), { public: true })
  return router
}

const at = (path: string) => new Request(`http://shop.test${path}`)

describe('answerOf', () => {
  test('the router whose path fits best answers, whatever their order', async () => {
    const routers = [routerAt('/api', '/things/:id', 'any thing'), routerAt('/api', '/things/new', 'a new thing')]

    expect(await (await answerOf(routers, at('/api/things/new')))!.text()).toBe('a new thing')
    expect(await (await answerOf(routers, at('/api/things/7')))!.text()).toBe('any thing')
  })

  test('with no path of theirs, the first router whose prefix it is under answers, a 404', async () => {
    const answer = await answerOf([routerAt('/api', '/things', 'things')], at('/api/elsewhere'))

    expect(answer!.status).toBe(404)
  })

  test('outside every router, none', () => {
    expect(answerOf([routerAt('/api', '/things', 'things')], at('/page'))).toBeNull()
    expect(answerOf([], at('/api/things'))).toBeNull()
  })
})
