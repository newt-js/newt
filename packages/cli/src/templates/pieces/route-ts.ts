import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
import { quoted }           from '../quoted/quoted'

/** `takesId`: its input is the entity's id itself, a string it parses (`get(id: string)`), not a DTO that carries it. */
export type RouteShape = { method: string, path: string, takesInput: boolean, takesId: boolean, returnsNothing: boolean }

/** A route that calls a use case: with the id of its path, or its body as it came, and answers what it tells. */
export function routeLine({ type, plural }: ModuleNames, useCase: PieceNames, { method, path, takesInput, takesId, returnsNothing }: RouteShape): string {
  const byId = path.split('/').includes(':id')
  const read = !takesInput ? [] : byId ? (takesId ? [] : [`const id = ${type}Id.from(request.params.id)`]) : ['const body = await bodyOf(request)']
  const input = !takesInput ? '' : byId ? (takesId ? 'request.params.id' : '{ id }') : 'body'
  const call = `await ${plural}.${useCase.camel}(${input})`
  const fits = `    return Response.json(${call})`.length <= 80
  const answer = returnsNothing ? [call, 'return new Response(null, { status: 204 })']
    : fits ? [`return Response.json(${call})`] : [`const answer = ${call}`, 'return Response.json(answer)']
  const uses = takesInput ? 'request' : '()'
  const body = [...read, ...answer].map(line => `    ${line}`).join('\n')
  return `  router.${method}(${quoted(path)}, async ${uses} => {\n${body}\n  })`
}

/** Tests that call the route, on a new entity when its path takes an id: it calls its use case with it, and refuses who has not signed in. */
export function routeTest({ plural }: ModuleNames, useCase: PieceNames, { method, path, takesInput, takesId, returnsNothing }: RouteShape): string {
  const url = path.split('/').map(segment => segment === ':id' ? '${created.id}' : segment).join('/')
  const verb = method.toUpperCase()
  const create = path.split('/').includes(':id') ? `\n  const created = await ${plural}.create({ name: 'First' })` : ''
  const target = url.includes('${') ? `\`${url}\`` : quoted(url)
  const request = `call('${verb}', ${target})`
  return `test('${verb} ${path} calls ${useCase.camel}', async () => {${create}
  const called = spyOn(${plural}, '${useCase.camel}')

  const response = await ${request}
  expect(response?.status).toBe(${returnsNothing ? 204 : 200})
  expect(called).toHaveBeenCalledWith(${!takesInput ? '' : takesId ? 'created.id' : '{ id: created.id }'})
})

test('${verb} ${path} refuses who has not signed in', async () => {${create}
  signedIn = false

  const response = await ${request}
  expect(response?.status).toBe(401)
})`
}
