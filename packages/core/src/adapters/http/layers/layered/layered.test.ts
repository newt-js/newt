import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { withParams } from '../../request/with-params/with-params'
import { HttpRoute }  from '../../router/http-route'
import { Layer }      from '../layer'
import { Layering }   from '../layering'
import { layered }    from './layered'

describe('layered', () => {
  test('a route inside its layers, the first outermost: a request meets them in order, its answer leaves backwards', async () => {
    const seen: string[] = []
    const spy = (name: string): Layer => ({
      name,
      around: route => async request => {
        seen.push(`> ${name}`)
        const response = await route(request)
        seen.push(`< ${name}`)
        return response
      },
    })
    const route: HttpRoute = () => {
      seen.push('route')
      return new Response('done')
    }

    await layered(route, [spy('outer'), spy('middle'), spy('inner')], {} as Layering)(withParams(new Request('http://shop.test/'), {}))

    expect(seen).toEqual(['> outer', '> middle', '> inner', 'route', '< inner', '< middle', '< outer'])
  })
})
