import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
import { quoted }           from '../quoted/quoted'

export type RouteShape = { method: string, path: string, takesInput: boolean, returnsNothing: boolean }

/** A route that calls a use case: with the id of its path, or its body as it came, and answers what it tells. */
export function routeLine({ type, plural }: ModuleNames, useCase: PieceNames, { method, path, takesInput, returnsNothing }: RouteShape): string {
  const input = !takesInput ? '' : path.split('/').includes(':id') ? `{ id: ${type}Id.from(request.params.id) }` : 'await bodyOf(request)'
  const call = `await ${plural}.${useCase.camel}(${input})`
  const answer = returnsNothing ? `{\n    ${call}\n    return new Response(null, { status: 204 })\n  }` : `Response.json(${call})`
  const uses = input === '' ? '()' : 'request'
  return `  router.${method}(${quoted(path)}, async ${uses} => ${answer})`
}

/** Tests that call the route, on a new entity when its path takes an id: it calls its use case with it, and refuses who has not signed in. */
export function routeTest({ plural }: ModuleNames, useCase: PieceNames, { method, path, takesInput, returnsNothing }: RouteShape): string {
  const url = path.split('/').map(segment => segment === ':id' ? '${created.id}' : segment).join('/')
  const verb = method.toUpperCase()
  const create = path.split('/').includes(':id') ? `\n  const created = await ${plural}.create({ name: 'First' })` : ''
  const request = `router.answer(new Request(\`http://backend.test/api${url}\`, { method: '${verb}' }))`
  return `test('${verb} ${path} calls ${useCase.camel}', async () => {${create}
  const called = spyOn(${plural}, '${useCase.camel}')

  const response = await ${request}
  expect(response?.status).toBe(${returnsNothing ? 204 : 200})
  expect(called).toHaveBeenCalledWith(${takesInput ? '{ id: created.id }' : ''})
})

test('${verb} ${path} answers 401 to who has not signed in', async () => {${create}
  signedIn = false

  const response = await ${request}
  expect(response?.status).toBe(401)
})`
}
